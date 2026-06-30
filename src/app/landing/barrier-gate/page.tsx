"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
    LuCamera,
    LuCheck,
    LuLoader,
    LuRefreshCw,
    LuX,
} from "react-icons/lu";
import {
    getStoredDeviceCredential,
    normalizeBarrierDirection,
} from "@/src/app/lib/device";
import { barrierHardwareAdapter } from "@/src/app/lib/hardwareAdapter";
import { normalizePlateNo } from "@/src/app/lib/plate";
import { BARRIER_RETURN_STORAGE_KEY } from "@/src/app/lib/storageKeys";
import type {
    LprDetectedEvent,
    LprDirection,
} from "@/src/app/type/client";
import "@/src/app/css/BarrierGate.css";

type GateState = "waiting" | "checking" | "open" | "denied" | "error";
type ConnectionState = "connecting" | "connected" | "disconnected";
type BarrierSubscription = {
    gateId: string;
    direction: LprDirection;
    cameraId: string | null;
};

const DEFAULT_GATE_IDS: Record<LprDirection, string> = {
    IN: "GATE-IN-A",
    OUT: "GATE-OUT-A",
};
const DEFAULT_CAMERA_IDS: Record<LprDirection, string> = {
    IN: "CAM-IN-A",
    OUT: "CAM-OUT-A",
};
const MAX_PROCESSED_EVENTS = 200;
const AUTO_RESET_MS = 10000;
const SSE_RECONNECT_MS = 3000;
const LPR_ACTIONS = new Set([
    "OPEN_GATE",
    "PAYMENT_REQUIRED",
    "IGNORE_DUPLICATE",
    "IGNORE_ACTIVE_TRANSACTION",
    "TRANSACTION_NOT_FOUND",
]);

type LprDetectedEventPayload = Partial<LprDetectedEvent> & {
    data?: Partial<
        Pick<
            LprDetectedEvent,
            | "transactionId"
            | "plateNo"
            | "direction"
            | "status"
            | "gateId"
            | "cameraId"
            | "action"
            | "message"
            | "paymentRequired"
            | "reason"
            | "remainingAmount"
            | "netAmount"
            | "totalPaid"
            | "exitTimeLimit"
            | "capturedAt"
            | "checkedAt"
        >
    > & {
        success?: boolean;
    };
};

function getConnectionTranslationKey(state: ConnectionState) {
    switch (state) {
        case "connected":
            return "connectionConnected" as const;
        case "disconnected":
            return "connectionDisconnected" as const;
        default:
            return "connectionConnecting" as const;
    }
}

function normalizeLprEvent(value: LprDetectedEventPayload) {
    const transactionId = value.transactionId ?? value.data?.transactionId;
    const plateNo = value.plateNo ?? value.data?.plateNo;
    const direction = value.direction ?? value.data?.direction;
    const status = value.status ?? value.data?.status;
    const action = value.action ?? value.data?.action;
    const eventType = value.type ?? (action ? "lpr_detected" : undefined);
    const gateId =
        value.gateId ??
        value.data?.gateId ??
        (direction === "IN" || direction === "OUT"
            ? DEFAULT_GATE_IDS[direction]
            : undefined);
    const cameraId =
        value.cameraId ??
        value.data?.cameraId ??
        (direction === "IN" || direction === "OUT"
            ? DEFAULT_CAMERA_IDS[direction]
            : undefined);
    const capturedAt =
        value.capturedAt ??
        value.data?.capturedAt ??
        value.checkedAt ??
        value.data?.checkedAt ??
        value.emittedAt ??
        new Date().toISOString();

    if (
        eventType !== "lpr_detected" ||
        !action ||
        !LPR_ACTIONS.has(action) ||
        !transactionId ||
        !plateNo ||
        !gateId ||
        (direction !== "IN" && direction !== "OUT")
    ) {
        return null;
    }

    return {
        type: "lpr_detected",
        success: value.success ?? value.data?.success ?? false,
        action,
        message: value.message ?? value.data?.message ?? "",
        transactionId,
        plateNo,
        vehicleType: value.vehicleType ?? "",
        cameraId: cameraId ?? "",
        gateId,
        direction,
        status: status ?? "",
        paymentRequired: value.paymentRequired ?? value.data?.paymentRequired,
        reason: value.reason ?? value.data?.reason ?? null,
        remainingAmount: value.remainingAmount ?? value.data?.remainingAmount ?? null,
        netAmount: value.netAmount ?? value.data?.netAmount ?? null,
        totalPaid: value.totalPaid ?? value.data?.totalPaid ?? null,
        exitTimeLimit: value.exitTimeLimit ?? value.data?.exitTimeLimit ?? null,
        capturedAt,
        checkedAt: value.checkedAt ?? value.data?.checkedAt ?? null,
        emittedAt: value.emittedAt ?? capturedAt,
    } satisfies LprDetectedEvent;
}

function hasPaymentRequired(event: LprDetectedEvent) {
    return event.action === "PAYMENT_REQUIRED" || event.paymentRequired === true;
}

function formatAmount(value?: number | null) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return value.toLocaleString("th-TH");
}

function logBarrierDebug(message: string, data?: unknown) {
    if (process.env.NODE_ENV === "production") return;
    console.info(`[BarrierGate] ${message}`, data ?? "");
}

function inferDirectionFromText(...values: Array<string | null | undefined>) {
    const text = values.filter(Boolean).join(" ").toUpperCase();

    if (
        /\bOUT\b/.test(text) ||
        text.includes("EXIT") ||
        text.includes("ขาออก") ||
        text.includes("ออก")
    ) {
        return "OUT" as const;
    }

    if (
        /\bIN\b/.test(text) ||
        text.includes("ENTRY") ||
        text.includes("ENTRANCE") ||
        text.includes("ขาเข้า") ||
        text.includes("เข้า")
    ) {
        return "IN" as const;
    }

    return null;
}

function resolveBarrierSubscription(
    requestedDirection: string | undefined,
    requestedGateId: string,
    requestedCameraId: string
): BarrierSubscription {
    const credential = getStoredDeviceCredential();
    const direction =
        normalizeBarrierDirection(requestedDirection) ??
        normalizeBarrierDirection(credential?.direction) ??
        inferDirectionFromText(
            credential?.gateId,
            credential?.cameraId,
            credential?.deviceName,
            credential?.location,
            credential?.deviceId
        ) ??
        "IN";

    const gateId =
        requestedGateId ||
        credential?.gateId?.trim() ||
        DEFAULT_GATE_IDS[direction];
    const cameraId =
        requestedCameraId ||
        credential?.cameraId?.trim() ||
        DEFAULT_CAMERA_IDS[direction];

    return {
        gateId,
        cameraId,
        direction,
    };
}

function formatCapturedAt(value: string, locale: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(
        locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH",
        {
            dateStyle: "medium",
            timeStyle: "medium",
            timeZone: "Asia/Bangkok",
        }
    ).format(date);
}

export default function BarrierGatePage() {
    const t = useTranslations("BarrierGate");
    const locale = useLocale();
    const searchParams = useSearchParams();
    const requestedDirection = searchParams.get("direction")?.toUpperCase();
    const requestedGateId = searchParams.get("gateId")?.trim() ?? "";
    const requestedCameraId = searchParams.get("cameraId")?.trim() ?? "";
    const subscriptions = useMemo(() => {
        const subscription = resolveBarrierSubscription(
            requestedDirection,
            requestedGateId,
            requestedCameraId
        );
        logBarrierDebug("Barrier mapping resolved", subscription);
        return [subscription];
    }, [requestedCameraId, requestedDirection, requestedGateId]);
    const activeSubscription = subscriptions[0];
    const [inputValue, setInputValue] = useState("");
    const [lastDetectedValue, setLastDetectedValue] = useState("");
    const [gateState, setGateState] = useState<GateState>("waiting");
    const [message, setMessage] = useState("");
    const [connectionState, setConnectionState] =
        useState<ConnectionState>("connecting");
    const [lprEvent, setLprEvent] = useState<LprDetectedEvent | null>(null);
    const processedEventsRef = useRef(new Set<string>());
    const navigationTimerRef = useRef<number | null>(null);

    const resetCapture = useCallback(() => {
        if (navigationTimerRef.current !== null) {
            window.clearTimeout(navigationTimerRef.current);
            navigationTimerRef.current = null;
        }
        setInputValue("");
        setMessage("");
        setLprEvent(null);
        setGateState("waiting");
    }, []);

    const deny = useCallback((reason: string) => {
        setGateState("denied");
        setMessage(reason);
    }, []);

    const handleLprEvent = useCallback(async (event: LprDetectedEvent) => {
        const matchingSubscription = subscriptions.find((subscription) => (
            event.gateId === subscription.gateId &&
            event.direction === subscription.direction &&
            (!subscription.cameraId || !event.cameraId || event.cameraId === subscription.cameraId)
        ));

        if (!matchingSubscription) {
            logBarrierDebug("LPR event ignored: mapping mismatch", {
                event: {
                    gateId: event.gateId,
                    cameraId: event.cameraId,
                    direction: event.direction,
                },
                subscriptions,
            });
            return;
        }
        if (event.action === "IGNORE_DUPLICATE") return;

        const eventKey = `${event.transactionId}:${event.action}:${event.capturedAt}`;
        if (processedEventsRef.current.has(eventKey)) return;

        processedEventsRef.current.add(eventKey);
        if (processedEventsRef.current.size > MAX_PROCESSED_EVENTS) {
            const oldestKey = processedEventsRef.current.values().next().value;
            if (oldestKey) processedEventsRef.current.delete(oldestKey);
        }

        setInputValue(normalizePlateNo(event.plateNo));
        setLastDetectedValue(normalizePlateNo(event.plateNo));
        setLprEvent(event);

        if (hasPaymentRequired(event)) {
            setGateState("denied");
            setMessage(event.message || t("actionPaymentRequired"));

            sessionStorage.setItem(
                BARRIER_RETURN_STORAGE_KEY,
                `/landing/barrier-gate?${new URLSearchParams({
                    gateId: event.gateId,
                    direction: event.direction,
                    ...(event.cameraId ? { cameraId: event.cameraId } : {}),
                }).toString()}`
            );
            return;
        }

        switch (event.action) {
            case "OPEN_GATE":
                try {
                    await barrierHardwareAdapter.openGate();
                    setGateState("open");
                    setMessage(
                        event.direction === "OUT"
                            ? t("actionExitOpenGate")
                            : t("actionOpenGate")
                    );
                } catch (error) {
                    console.error("Barrier hardware open failed:", error);
                    setGateState("error");
                    setMessage(t("offline"));
                }
                break;
            case "PAYMENT_REQUIRED":
                deny(event.message || t("actionPaymentRequired"));
                break;
            case "IGNORE_ACTIVE_TRANSACTION":
                deny(t("actionActiveTransaction"));
                break;
            case "TRANSACTION_NOT_FOUND":
                deny(t("actionTransactionNotFound"));
                break;
        }
    }, [deny, subscriptions, t]);

    useEffect(() => {
        if (
            gateState !== "open" &&
            gateState !== "denied" &&
            gateState !== "error"
        ) {
            return;
        }

        const timer = window.setTimeout(resetCapture, AUTO_RESET_MS);
        return () => window.clearTimeout(timer);
    }, [gateState, resetCapture]);

    useEffect(() => {
        const abortControllers: AbortController[] = [];
        const reconnectTimers = new Set<number>();
        let isStopped = false;

        const connect = async (subscription: {
            gateId: string;
            direction: LprDirection;
            cameraId: string | null;
        }) => {
            const abortController = new AbortController();
            abortControllers.push(abortController);
            setConnectionState("connecting");

            const credential = getStoredDeviceCredential();
            const params = new URLSearchParams({
                gateId: subscription.gateId,
                direction: subscription.direction,
                ...(subscription.cameraId ? { cameraId: subscription.cameraId } : {}),
                ...(credential?.deviceId ? { deviceId: credential.deviceId } : {}),
            });
            const url = `/api/client/events?${params.toString()}`;

            logBarrierDebug("SSE subscribe", url);

            try {
                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        Accept: "text/event-stream",
                        ...(credential?.deviceId
                            ? { "x-device-id": credential.deviceId }
                            : {}),
                        ...(credential?.deviceToken
                            ? { "x-device-token": credential.deviceToken }
                            : {}),
                    },
                    cache: "no-store",
                    signal: abortController.signal,
                });

                if (!response.ok || !response.body) {
                    throw new Error(
                        `Cannot connect to barrier event stream (${response.status})`
                    );
                }

                setConnectionState("connected");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (!isStopped) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const messages = buffer.split(/\r?\n\r?\n/);
                    buffer = messages.pop() ?? "";

                    for (const rawMessage of messages) {
                        const dataLines = rawMessage
                            .split(/\r?\n/)
                            .filter((line) => line.startsWith("data:"))
                            .map((line) => line.slice(5).trimStart());

                        if (dataLines.length === 0) continue;

                        try {
                            const payload = JSON.parse(
                                dataLines.join("\n")
                            ) as LprDetectedEventPayload;
                            const event = normalizeLprEvent(payload);

                            if (!event) continue;

                            logBarrierDebug("SSE lpr_detected received", event);
                            void handleLprEvent(event);
                        } catch (error) {
                            console.warn("Unable to parse barrier SSE event:", error);
                        }
                    }
                }
            } catch (error) {
                if (abortController.signal.aborted) return;
                console.warn("Barrier SSE disconnected:", error);
            }

            if (!isStopped) {
                setConnectionState("disconnected");
                const reconnectTimer = window.setTimeout(() => {
                    reconnectTimers.delete(reconnectTimer);
                    void connect(subscription);
                }, SSE_RECONNECT_MS);
                reconnectTimers.add(reconnectTimer);
            }
        };

        subscriptions.forEach((subscription) => {
            void connect(subscription);
        });

        return () => {
            isStopped = true;
            abortControllers.forEach((abortController) => abortController.abort());
            reconnectTimers.forEach((reconnectTimer) =>
                window.clearTimeout(reconnectTimer)
            );
            if (navigationTimerRef.current !== null) {
                window.clearTimeout(navigationTimerRef.current);
            }
        };
    }, [handleLprEvent, subscriptions]);

    return (
        <main className="barrier-gate-page">
            <section className="barrier-gate-page__content">
                <header className="barrier-gate-header">
                    <div className="barrier-gate-header__icon">
                        {gateState === "checking" ? (
                            <LuLoader className="barrier-gate-spin" />
                        ) : gateState === "open" ? (
                            <LuCheck />
                        ) : gateState === "denied" || gateState === "error" ? (
                            <LuX />
                        ) : (
                            <LuCamera />
                        )}
                    </div>
                    <h1>{t("title")}</h1>
                    <p>{t("subtitle")}</p>
                    <div
                        className={`barrier-gate-connection barrier-gate-connection--${connectionState}`}
                        aria-live="polite"
                    >
                        <span />
                        {t(getConnectionTranslationKey(connectionState))}
                    </div>
                    <p className="barrier-gate-header__gate">
                        {t("gateInfo", {
                            gateId: activeSubscription.gateId,
                            direction: activeSubscription.direction,
                        })}
                    </p>
                </header>

                <section className="barrier-gate-capture" aria-live="polite">
                    <span className="barrier-gate-capture__label">{t("inputLabel")}</span>
                    <strong>{inputValue || t("waiting")}</strong>
                    <p>
                        {gateState === "checking"
                            ? t("checking")
                            : lprEvent
                                ? t("lprDetectedAt", {
                                    value: formatCapturedAt(
                                        lprEvent.capturedAt,
                                        locale
                                    ),
                                })
                            : lastDetectedValue
                                ? t("lastDetected", { value: lastDetectedValue })
                                : t("inputHint")}
                    </p>
                </section>

                {message ? (
                    <div className={`barrier-gate-alert barrier-gate-alert--${gateState}`}>
                        {message}
                    </div>
                ) : null}

                {lprEvent ? (
                    <section className="barrier-gate-event">
                        <div>
                            <span>{t("transactionId")}</span>
                            <strong>{lprEvent.transactionId}</strong>
                        </div>
                        <div>
                            <span>{t("eventStatus")}</span>
                            <strong>{lprEvent.status}</strong>
                        </div>
                        <div>
                            <span>{t("eventAction")}</span>
                            <strong>{lprEvent.action}</strong>
                        </div>
                        <div>
                            <span>Gate</span>
                            <strong>{lprEvent.gateId}</strong>
                        </div>
                        <div>
                            <span>Camera</span>
                            <strong>{lprEvent.cameraId || "-"}</strong>
                        </div>
                        <div>
                            <span>Direction</span>
                            <strong>{lprEvent.direction}</strong>
                        </div>
                        {hasPaymentRequired(lprEvent) ? (
                            <>
                                <div>
                                    <span>{t("remaining")}</span>
                                    <strong>{formatAmount(lprEvent.remainingAmount)}</strong>
                                </div>
                                <div>
                                    <span>{t("netAmount")}</span>
                                    <strong>{formatAmount(lprEvent.netAmount)}</strong>
                                </div>
                                <div>
                                    <span>{t("totalPaid")}</span>
                                    <strong>{formatAmount(lprEvent.totalPaid)}</strong>
                                </div>
                            </>
                        ) : null}
                        <p>{lprEvent.message}</p>
                    </section>
                ) : null}

                <button
                    type="button"
                    onClick={resetCapture}
                    className="barrier-gate-reset"
                    disabled={gateState === "checking"}
                >
                    <LuRefreshCw />
                    <span>{t("reset")}</span>
                </button>
            </section>
        </main>
    );
}
