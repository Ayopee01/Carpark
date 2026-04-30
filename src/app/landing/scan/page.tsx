"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Components
import BackBtn from "@/src/app/components/BackBtn";

// CSS
import "@/src/app/css/Scan.css";

const SEARCH_API_PATH = "/api/kiosk/search";
const PRELOAD_DELAY_MS = null;

const STORAGE_KEYS = {
    searchedPlate: "searchedPlate",
    plateDetailData: "plateDetailData",
    plateSearchResponse: "plateSearchResponse",
} as const;

type KioskSearchItem = {
    id: string;
    billNo: string;
    plateNo: string;
    vehicleType: string;
    serviceType: string;
    entryAt: string;
    exitAt: string | null;
    calculatedAt: string;
    exitTimeLimit: string | null;
    isOverstay: boolean;
    status: string;
    baseAmount: number;
    netAmount: number;
    totalPaid: number;
    remainingAmount: number;
    serviceDisplay: string;
    durationHour: number;
    totalMinutes: number;
    payments: unknown[];
    qrData: string;
    createdAt: string;
    updatedAt: string;
};

type KioskSearchResponse = {
    success?: boolean;
    message?: string;
    count?: number;
    items?: KioskSearchItem[];
};

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

async function fetchKioskSearch(plateNo: string) {
    const searchParams = new URLSearchParams({
        plateNo,
    });

    const response = await fetch(`${SEARCH_API_PATH}?${searchParams.toString()}`, {
        method: "GET",
        cache: "no-store",
    });

    const result = (await response.json().catch(() => null)) as
        | KioskSearchResponse
        | null;

    return {
        status: response.status,
        result,
    };
}

function saveSearchResult(plateNo: string, response: KioskSearchResponse) {
    const firstItem = response.items?.[0] ?? null;

    sessionStorage.setItem(STORAGE_KEYS.searchedPlate, plateNo);
    sessionStorage.setItem(
        STORAGE_KEYS.plateDetailData,
        JSON.stringify(firstItem)
    );
    sessionStorage.setItem(
        STORAGE_KEYS.plateSearchResponse,
        JSON.stringify(response)
    );
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

    const bufferRef = useRef("");
    const loadingRef = useRef(false);
    const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearScanTimer = useCallback(() => {
        if (scanTimerRef.current) {
            clearTimeout(scanTimerRef.current);
            scanTimerRef.current = null;
        }
    }, []);

    const resetScanBuffer = useCallback(() => {
        bufferRef.current = "";
        setScannedPlate("");
        clearScanTimer();
    }, [clearScanTimer]);

    const handleSearch = useCallback(
        async (scanValue: string) => {
            const trimmedPlate = extractPlateFromScanValue(scanValue);

            if (!trimmedPlate || loadingRef.current) return;

            try {
                loadingRef.current = true;
                setLoading(true);
                setError("");
                setScannedPlate(trimmedPlate);

                const { status, result } = await fetchKioskSearch(trimmedPlate);

                if (!result) {
                    throw new Error("ข้อมูลที่ได้รับจาก API ไม่ถูกต้อง");
                }

                if (status === 404) {
                    throw new Error("ไม่พบข้อมูลทะเบียนนี้ในระบบ");
                }

                if (status >= 400) {
                    throw new Error(
                        getErrorMessage(result, "ค้นหาข้อมูลทะเบียนไม่สำเร็จ")
                    );
                }

                if (!Array.isArray(result.items) || result.items.length === 0) {
                    throw new Error("ไม่พบข้อมูลทะเบียนนี้ในระบบ");
                }

                saveSearchResult(trimmedPlate, result);

                router.push(
                    `/landing/detail?plate=${encodeURIComponent(trimmedPlate)}`
                );
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "เกิดข้อผิดพลาด กรุณาลองใหม่"
                );
                resetScanBuffer();
            } finally {
                loadingRef.current = false;
                setLoading(false);
            }
        },
        [resetScanBuffer, router]
    );

    const scheduleAutoSubmit = useCallback(() => {
        if (PRELOAD_DELAY_MS === null) return;

        clearScanTimer();

        scanTimerRef.current = setTimeout(() => {
            const value = bufferRef.current.trim();

            if (!value || loadingRef.current) return;

            bufferRef.current = "";
            void handleSearch(value);
        }, PRELOAD_DELAY_MS);
    }, [clearScanTimer, handleSearch]);

    useEffect(() => {
        const handleBarcodeInput = (event: KeyboardEvent) => {
            if (loadingRef.current) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();

                const value = bufferRef.current.trim();

                if (!value) return;

                bufferRef.current = "";
                clearScanTimer();
                void handleSearch(value);
                return;
            }

            if (event.key === "Backspace") {
                event.preventDefault();

                bufferRef.current = bufferRef.current.slice(0, -1);
                setScannedPlate(bufferRef.current);
                scheduleAutoSubmit();
                return;
            }

            if (event.key.length === 1) {
                event.preventDefault();

                bufferRef.current += event.key;
                setScannedPlate(bufferRef.current);
                setError("");
                scheduleAutoSubmit();
            }
        };

        const handlePaste = (event: ClipboardEvent) => {
            if (loadingRef.current) return;

            const pastedValue = event.clipboardData?.getData("text") ?? "";

            if (!pastedValue.trim()) return;

            event.preventDefault();

            bufferRef.current = "";
            clearScanTimer();

            const plate = extractPlateFromScanValue(pastedValue);
            setScannedPlate(plate || pastedValue.trim());

            void handleSearch(pastedValue);
        };

        window.addEventListener("keydown", handleBarcodeInput);
        window.addEventListener("paste", handlePaste);

        return () => {
            window.removeEventListener("keydown", handleBarcodeInput);
            window.removeEventListener("paste", handlePaste);
            clearScanTimer();
        };
    }, [clearScanTimer, handleSearch, scheduleAutoSubmit]);

    return (
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
                        alt="scanner viewfinder"
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
                        เลขทะเบียนที่รับจากเครื่องสแกน
                    </p>

                    <strong className="scan-page__result-value">
                        {scannedPlate || "รอรับข้อมูล..."}
                    </strong>

                    {loading ? (
                        <p className="scan-page__status">
                            กำลังค้นหาข้อมูลทะเบียน...
                        </p>
                    ) : null}

                    {error ? (
                        <p className="scan-page__error">
                            {error}
                        </p>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

export default ScanPage;