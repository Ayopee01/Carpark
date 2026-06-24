"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
    LuCamera,
    LuCheck,
    LuLoader,
    LuRefreshCw,
    LuX,
} from "react-icons/lu";
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

const DEFAULT_GATE_IDS: Record<LprDirection, string> = {
    IN: "GATE-A",
    OUT: "GATE-A",
};
const MAX_PROCESSED_EVENTS = 200;
const AUTO_RESET_MS = 10000;
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
            "transactionId" | "plateNo" | "direction" | "status"
        >
    >;
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

    if (
        value.type !== "lpr_detected" ||
        !value.action ||
        !LPR_ACTIONS.has(value.action) ||
        !transactionId ||
        !plateNo ||
        !value.gateId ||
        (direction !== "IN" && direction !== "OUT")
    ) {
        return null;
    }

    return {
        type: "lpr_detected",
        success: value.success ?? false,
        action: value.action,
        message: value.message ?? "",
        transactionId,
        plateNo,
        vehicleType: value.vehicleType ?? "",
        cameraId: value.cameraId ?? "",
        gateId: value.gateId,
        direction,
        status: status ?? "",
        exitTimeLimit: value.exitTimeLimit ?? null,
        capturedAt: value.capturedAt ?? value.emittedAt ?? new Date().toISOString(),
        emittedAt: value.emittedAt ?? value.capturedAt ?? new Date().toISOString(),
    } satisfies LprDetectedEvent;
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
    const isSingleDirection =
        requestedDirection === "IN" || requestedDirection === "OUT";
    const direction = isSingleDirection
        ? (requestedDirection as LprDirection)
        : null;
    const gateId = direction
        ? requestedGateId || DEFAULT_GATE_IDS[direction]
        : null;
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
        const matchesCurrentPage = direction && gateId
            ? event.gateId === gateId && event.direction === direction
            : event.gateId === DEFAULT_GATE_IDS[event.direction];

        if (!matchesCurrentPage) return;
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
                setGateState("denied");
                setMessage(event.message || t("actionPaymentRequired"));

                sessionStorage.setItem(
                    BARRIER_RETURN_STORAGE_KEY,
                    `/landing/barrier-gate?${new URLSearchParams({
                        ...(gateId ? { gateId } : {}),
                        ...(direction ? { direction } : {}),
                    }).toString()}`
                );

                navigationTimerRef.current = window.setTimeout(() => {
                    window.location.assign(
                        `/landing/detail?plateNo=${encodeURIComponent(event.plateNo)}`
                    );
                }, 800);
                break;
            case "IGNORE_ACTIVE_TRANSACTION":
                deny(t("actionActiveTransaction"));
                break;
            case "TRANSACTION_NOT_FOUND":
                deny(t("actionTransactionNotFound"));
                break;
        }
    }, [deny, direction, gateId, t]);

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
        const subscriptions = direction && gateId
            ? [{ gateId, direction }]
            : ([
                { gateId: DEFAULT_GATE_IDS.IN, direction: "IN" },
                { gateId: DEFAULT_GATE_IDS.OUT, direction: "OUT" },
            ] satisfies Array<{ gateId: string; direction: LprDirection }>);

        const sources = subscriptions.map((subscription) => {
            const params = new URLSearchParams(subscription);
            const source = new EventSource(
                `/api/client/events?${params.toString()}`
            );

            source.onopen = () => {
                setConnectionState("connected");
            };

            source.onmessage = (messageEvent) => {
                try {
                    const payload = JSON.parse(
                        messageEvent.data
                    ) as LprDetectedEventPayload;
                    const event = normalizeLprEvent(payload);

                    if (!event) return;
                    void handleLprEvent(event);
                } catch (error) {
                    console.warn("Unable to parse barrier SSE event:", error);
                }
            };

            source.onerror = () => {
                const hasConnectedSource = sources.some(
                    (item) => item.readyState === EventSource.OPEN
                );
                setConnectionState(
                    hasConnectedSource ? "connected" : "disconnected"
                );
                // Native EventSource reconnects automatically while it remains open.
            };

            return source;
        });

        return () => {
            sources.forEach((source) => source.close());
            if (navigationTimerRef.current !== null) {
                window.clearTimeout(navigationTimerRef.current);
            }
        };
    }, [direction, gateId, handleLprEvent]);

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
                        {direction && gateId
                            ? t("gateInfo", { gateId, direction })
                            : t("gateInfoAll")}
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
