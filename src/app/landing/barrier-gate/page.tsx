"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    LuCamera,
    LuCheck,
    LuLoader,
    LuRefreshCw,
    LuX,
} from "react-icons/lu";
import {
    clearDeviceStorage,
    getDeviceAuthHeaders,
    getDeviceId,
} from "@/src/app/lib/device";
import { barrierHardwareAdapter } from "@/src/app/lib/hardwareAdapter";
import { normalizePlateNo } from "@/src/app/lib/plate";
import type {
    ApiErrorResponse,
    ClientTransactionResponse,
} from "@/src/app/type/client";
import "@/src/app/css/BarrierGate.css";

type GateState = "waiting" | "checking" | "open" | "denied" | "error";

const DENIED_TRANSACTION_STATUSES = new Set([
    "cancelled",
    "canceled",
    "completed",
    "processed",
]);

function getErrorMessage(value: unknown, fallback: string) {
    if (
        value &&
        typeof value === "object" &&
        "message" in value &&
        typeof value.message === "string"
    ) {
        return value.message;
    }
    return fallback;
}

async function findTransaction(value: string) {
    const deviceId = getDeviceId("barrier-gate")?.trim() ?? "";
    const params = new URLSearchParams({ deviceId });
    const response = await fetch(
        `/api/client/transaction/${encodeURIComponent(value)}?${params}`,
        {
            headers: getDeviceAuthHeaders("barrier-gate"),
            cache: "no-store",
        }
    );
    const result = (await response.json().catch(() => null)) as
        | ClientTransactionResponse
        | ApiErrorResponse
        | null;
    return { response, result };
}

export default function BarrierGatePage() {
    const [inputValue, setInputValue] = useState("");
    const [lastDetectedValue, setLastDetectedValue] = useState("");
    const [gateState, setGateState] = useState<GateState>("waiting");
    const [message, setMessage] = useState("");
    const [transaction, setTransaction] = useState<ClientTransactionResponse | null>(null);
    const bufferRef = useRef("");
    const loadingRef = useRef(false);

    const resetCapture = useCallback(() => {
        bufferRef.current = "";
        setInputValue("");
        setMessage("");
        setTransaction(null);
        setGateState("waiting");
    }, []);

    const deny = useCallback((reason: string) => {
        setGateState("denied");
        setMessage(reason);
    }, []);

    const handleInput = useCallback(async (rawValue: string) => {
        const value = normalizePlateNo(rawValue);
        if (!value || loadingRef.current) return;

        setInputValue(value);
        setLastDetectedValue(value);
        setTransaction(null);
        setMessage("");
        setGateState("checking");

        try {
            loadingRef.current = true;
            const { response, result } = await findTransaction(value);

            if (response.status === 401) {
                clearDeviceStorage();
                window.location.replace("/landing/activate");
                return;
            }

            if (response.status === 403) {
                const apiError = result as ApiErrorResponse | null;
                if (apiError?.status === "maintenance") {
                    window.location.replace("/landing/maintenance");
                    return;
                }
                deny(getErrorMessage(result, "รายการนี้ไม่สามารถดำเนินการได้"));
                return;
            }

            if (response.status === 404) {
                deny("ไม่พบรายการจอดรถ");
                return;
            }

            if (!response.ok || !result || !("transactionId" in result)) {
                throw new Error(getErrorMessage(result, "ตรวจสอบรายการไม่สำเร็จ"));
            }

            const nextTransaction = result as ClientTransactionResponse;
            setTransaction(nextTransaction);

            if (nextTransaction.amount.remainingAmount > 0) {
                deny("ยังมียอดค้างชำระ กรุณาชำระเงินที่ Kiosk");
                return;
            }

            if (DENIED_TRANSACTION_STATUSES.has(nextTransaction.status.toLowerCase())) {
                deny("รายการนี้ถูกดำเนินการแล้วหรือถูกยกเลิก");
                return;
            }

            await barrierHardwareAdapter.openGate();
            setGateState("open");
            setMessage("เปิดไม้กั้นสำเร็จ");
        } catch (error) {
            setGateState("error");
            setMessage(
                error instanceof Error
                    ? error.message
                    : "อุปกรณ์ไม่สามารถเชื่อมต่อระบบได้"
            );
        } finally {
            loadingRef.current = false;
            bufferRef.current = "";
        }
    }, [deny]);

    useEffect(() => {
        const submitBuffer = () => {
            const value = bufferRef.current;
            bufferRef.current = "";
            void handleInput(value);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (loadingRef.current || event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                submitBuffer();
                return;
            }
            if (event.key === "Backspace") {
                event.preventDefault();
                bufferRef.current = bufferRef.current.slice(0, -1);
                setInputValue(bufferRef.current);
                return;
            }
            if (event.key.length === 1) {
                event.preventDefault();
                bufferRef.current += event.key;
                setInputValue(bufferRef.current);
            }
        };

        const handlePaste = (event: ClipboardEvent) => {
            const value = event.clipboardData?.getData("text")?.trim();
            if (!value || loadingRef.current) return;
            event.preventDefault();
            bufferRef.current = "";
            void handleInput(value);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("paste", handlePaste);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("paste", handlePaste);
        };
    }, [handleInput]);

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
                    <h1>Barrier Gate</h1>
                    <p>Waiting for camera plateNo or transactionId input</p>
                </header>

                <section className="barrier-gate-capture" aria-live="polite">
                    <span className="barrier-gate-capture__label">plateNo / transactionId</span>
                    <strong>{inputValue || "Waiting..."}</strong>
                    <p>
                        {gateState === "checking"
                            ? "Checking transaction..."
                            : lastDetectedValue
                                ? `Last detected: ${lastDetectedValue}`
                                : "Submit input from LPR, camera, or external device"}
                    </p>
                </section>

                {message ? (
                    <div className={`barrier-gate-alert barrier-gate-alert--${gateState}`}>
                        {message}
                    </div>
                ) : null}

                {transaction ? (
                    <section className="barrier-gate-payment">
                        <div>
                            <span>{transaction.status}</span>
                            <h2>{transaction.plateNo}</h2>
                            <p>{transaction.duration.display}</p>
                        </div>
                        <div className="barrier-gate-payment__amount">
                            <span>Remaining</span>
                            <strong>
                                {transaction.amount.remainingAmount.toLocaleString("th-TH")} Baht
                            </strong>
                        </div>
                    </section>
                ) : null}

                <button
                    type="button"
                    onClick={resetCapture}
                    className="barrier-gate-reset"
                    disabled={gateState === "checking"}
                >
                    <LuRefreshCw />
                    <span>Reset capture</span>
                </button>
            </section>
        </main>
    );
}
