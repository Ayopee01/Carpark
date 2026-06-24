"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { normalizePlateNo } from "@/src/app/lib/plate";
import {
    getDeviceAuthHeaders,
    getDeviceId,
    handleDeviceResponseStatus,
} from "@/src/app/lib/device";
import { isAlreadyProcessedTransactionError } from "@/src/app/lib/transactionStatus";
import { savePlateTransactionResult } from "@/src/app/lib/transactionStorage";
import type { ClientTransactionResponse } from "@/src/app/type/client";

// Components
import BackBtn from "@/src/app/components/BackBtn";
import PlateNotFoundPopup from "@/src/app/components/PlateNotFoundPopup";

// CSS
import "@/src/app/css/Scan.css";

const SEARCH_API_PATH = "/api/client/transaction";

async function fetchKioskSearch(plateNo: string) {
    const deviceId = getDeviceId("kiosk")?.trim() ?? "";
    const searchParams = new URLSearchParams({
        plateNo,
        deviceId,
    });

    const response = await fetch(`${SEARCH_API_PATH}?${searchParams.toString()}`, {
        method: "GET",
        headers: getDeviceAuthHeaders("kiosk"),
        cache: "no-store",
    });

    const result = (await response.json().catch(() => null)) as
        | ClientTransactionResponse
        | { message?: string; status?: string }
        | null;

    const wasRedirected = handleDeviceResponseStatus(
        response,
        result as { message?: string; status?: string } | null
    );

    return {
        status: response.status,
        result,
        wasRedirected,
    };
}

function safeDecodeURIComponent(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function extractPlateFromScanValue(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) return "";

    const decodedValue = safeDecodeURIComponent(trimmedValue).trim();

    try {
        const url = new URL(decodedValue, window.location.origin);

        const plateFromUrl =
            url.searchParams.get("plate") ||
            url.searchParams.get("plateNo") ||
            url.searchParams.get("plate_no");

        if (plateFromUrl) {
            return safeDecodeURIComponent(plateFromUrl).trim();
        }
    } catch {
        // ถ้าไม่ใช่ URL จะไปใช้เงื่อนไขด้านล่างแทน
    }

    const plateMatch = decodedValue.match(/[?&](plate|plateNo|plate_no)=([^&]+)/);

    if (plateMatch?.[2]) {
        return safeDecodeURIComponent(plateMatch[2]).trim();
    }

    return decodedValue;
}

function ScanPage() {
    const router = useRouter();
    const t = useTranslations("Scan");

    const [scannedPlate, setScannedPlate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isAlreadyProcessedError, setIsAlreadyProcessedError] = useState(false);
    const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);

    const bufferRef = useRef("");
    const loadingRef = useRef(false);

    const resetScanBuffer = useCallback(() => {
        bufferRef.current = "";
        setScannedPlate("");
    }, []);

    const handleSearch = useCallback(
        async (scanValue: string) => {
            const trimmedPlate = normalizePlateNo(extractPlateFromScanValue(scanValue));

            if (!trimmedPlate || loadingRef.current) return;

            try {
                loadingRef.current = true;
                setLoading(true);
                setError("");
                setIsAlreadyProcessedError(false);
                setScannedPlate(trimmedPlate);

                const { status, result, wasRedirected } = await fetchKioskSearch(trimmedPlate);

                if (wasRedirected) return;

                if (status === 404) {
                    setShowNotFoundPopup(true);
                    resetScanBuffer();
                    return;
                }

                if (status >= 400) {
                    const isAlreadyProcessed = isAlreadyProcessedTransactionError(status, result);

                    setIsAlreadyProcessedError(isAlreadyProcessed);
                    setError(
                        isAlreadyProcessed
                            ? t("errorAlreadyProcessed")
                            : t("errorSearchFailed")
                    );
                    resetScanBuffer();
                    return;
                }

                if (!result) {
                    setError(t("errorInvalidData"));
                    resetScanBuffer();
                    return;
                }

                savePlateTransactionResult(trimmedPlate, result as ClientTransactionResponse);

                router.push(
                    `/landing/detail?plateNo=${encodeURIComponent(trimmedPlate)}`
                );
            } catch (err) {
                console.error("Unexpected scan search error:", err);
                setError(t("errorUnexpected"));
                resetScanBuffer();
            } finally {
                loadingRef.current = false;
                setLoading(false);
            }
        },
        [resetScanBuffer, router, t]
    );

    useEffect(() => {
        const handleBarcodeInput = (event: KeyboardEvent) => {
            if (loadingRef.current) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();

                const value = bufferRef.current.trim();

                if (!value) return;

                bufferRef.current = "";
                void handleSearch(value);
                return;
            }

            if (event.key === "Backspace") {
                event.preventDefault();

                bufferRef.current = bufferRef.current.slice(0, -1);
                setScannedPlate(bufferRef.current);
                return;
            }

            if (event.key.length === 1) {
                event.preventDefault();

                bufferRef.current += event.key;
                setScannedPlate(bufferRef.current);
                setError("");
                setIsAlreadyProcessedError(false);
            }
        };

        const handlePaste = (event: ClipboardEvent) => {
            if (loadingRef.current) return;

            const pastedValue = event.clipboardData?.getData("text") ?? "";

            if (!pastedValue.trim()) return;

            event.preventDefault();

            bufferRef.current = "";

            const plate = extractPlateFromScanValue(pastedValue);
            setScannedPlate(plate || pastedValue.trim());

            void handleSearch(pastedValue);
        };

        window.addEventListener("keydown", handleBarcodeInput);
        window.addEventListener("paste", handlePaste);

        return () => {
            window.removeEventListener("keydown", handleBarcodeInput);
            window.removeEventListener("paste", handlePaste);
        };
    }, [handleSearch]);

    return (
        <>
            <section className="scan-page">
                <div className="scan-page__content">
                    <div>
                        <BackBtn />
                    </div>

                    <div className="scan-page__header">
                        <h1>Smart Carpark</h1>
                        <p>{t("subtitle")}</p>
                    </div>

                    <div className="scan-page__icon">
                        <div className="scan-page__divider" />

                        <Image
                            src="/icon/Scanner_Viewfinder.png"
                            alt={t("viewfinderAlt")}
                            className="scan-page__viewfinder"
                            width={384}
                            height={338}
                        />
                    </div>

                    <div className="scan-page__hint">
                        <p>{t("hintLine1")}</p>
                        <p>{t("hintLine2")}</p>
                    </div>

                    <div className="scan-page__result">
                        <p className="scan-page__result-label">
                            {t("resultLabel")}
                        </p>

                        <strong className="scan-page__result-value">
                            {scannedPlate || t("waitingInput")}
                        </strong>

                        {loading ? (
                            <p className="scan-page__status">
                                {t("searching")}
                            </p>
                        ) : null}

                        {error ? (
                            <p
                                className={`scan-page__error ${isAlreadyProcessedError ? "scan-page__error--processed" : ""}`}
                            >
                                {error}
                            </p>
                        ) : null}
                    </div>
                </div>
            </section>

            <PlateNotFoundPopup
                open={showNotFoundPopup}
                onClose={() => setShowNotFoundPopup(false)}
                onRetry={() => setShowNotFoundPopup(false)}
            />
        </>
    );
}

export default ScanPage;
