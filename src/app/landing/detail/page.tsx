"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

// Components
import BackBtn from "@/src/app/components/BackBtn";
import PaymentPopup from "@/src/app/components/PaymentPopup";
import {
    getPlateNoValidationMessage,
    isValidPlateNo,
    normalizePlateNo,
} from "@/src/app/lib/plate";
import {
    getActivatedDeviceType,
    getDeviceAuthHeaders,
    getDeviceId,
    handleDeviceResponseStatus,
} from "@/src/app/lib/device";
import type {
    ClientPaymentResponse,
    ClientTransactionResponse,
} from "@/src/app/type/client";

// CSS
import "@/src/app/css/Detail.css";

// Icons
import { FaCheck, FaChevronRight } from "react-icons/fa";
import { MdSupportAgent } from "react-icons/md";

// ------------------------------- Types -------------------------------
type DetailData = {
    id: string;
    billNo: string;
    plate: string;
    province: string;
    date: string;
    entryTime: string;
    duration: string;
    paymentStatus: string;
    amount: number;
    paymentMethod: string;
    qrData: string;
    raw: ClientTransactionResponse;
};

const STORAGE_KEYS = {
    searchedPlate: "searchedPlate",
    plateDetailData: "plateDetailData",
    plateSearchResponse: "plateSearchResponse",
} as const;

// ------------------------------- Helpers -------------------------------
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

function formatThaiDate(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Bangkok",
    }).format(date);
}

function formatThaiTime(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(date);
}

function formatDuration(totalMinutes: number) {
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "-";

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) {
        return `${minutes} นาที`;
    }

    return `${hours} ชั่วโมง ${minutes} นาที`;
}

function getPaymentStatusLabel(status: string) {
    switch (status) {
        case "pending":
            return "รอชำระเงิน";
        case "paid":
        case "completed":
            return "ชำระเงินแล้ว";
        case "cancelled":
            return "ยกเลิก";
        default:
            return status || "-";
    }
}

function mapKioskItemToDetailData(item: ClientTransactionResponse): DetailData {
    return {
        id: item.transactionId,
        billNo: item.billNo,
        plate: item.plateNo,
        province: "-",
        date: formatThaiDate(item.entryAt),
        entryTime: formatThaiTime(item.entryAt),
        duration: item.duration.display || formatDuration(item.duration.totalMinutes),
        paymentStatus: getPaymentStatusLabel(item.status),
        amount: item.amount.remainingAmount,
        paymentMethod: item.qrData ? "PromptPay / QR Code" : "PromptPay",
        qrData: item.qrData,
        raw: item,
    };
}

function saveDetailResult(plate: string, item: ClientTransactionResponse) {
    sessionStorage.setItem(STORAGE_KEYS.searchedPlate, plate);
    sessionStorage.setItem(STORAGE_KEYS.plateDetailData, JSON.stringify(item));
    sessionStorage.setItem(STORAGE_KEYS.plateSearchResponse, JSON.stringify(item));
}

// ------------------------------- Component -------------------------------
function DetailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const plate = normalizePlateNo(
        searchParams.get("plateNo") ?? searchParams.get("plate") ?? ""
    );

    const t = useTranslations("Detail");
    const common = useTranslations("Common");

    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [data, setData] = useState<DetailData | null>(null);
    const [fetchError, setFetchError] = useState("");
    const [resolvedPlate, setResolvedPlate] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!plate || !isValidPlateNo(plate)) return;

        let cancelled = false;

        const loadData = async () => {
            try {
                setLoading(true);
                setFetchError("");

                const deviceType = getActivatedDeviceType() ?? "kiosk";
                const deviceId = getDeviceId(deviceType)?.trim() ?? "";
                const query = new URLSearchParams({
                    plateNo: plate,
                    deviceId,
                });

                const response = await fetch(
                    `/api/kiosk/search?${query.toString()}`,
                    {
                        method: "GET",
                        headers: getDeviceAuthHeaders(deviceType),
                        cache: "no-store",
                    }
                );

                const result = (await response.json().catch(() => null)) as
                    | ClientTransactionResponse
                    | null;

                if (
                    handleDeviceResponseStatus(
                        response,
                        result as { message?: string; status?: string } | null
                    )
                ) {
                    return;
                }

                if (cancelled) return;

                if (!response.ok || !result) {
                    setResolvedPlate(plate);
                    setData(null);
                    setFetchError(
                        getErrorMessage(result, t("errorLoadFailed"))
                    );
                    return;
                }

                const mappedData = mapKioskItemToDetailData(result);

                saveDetailResult(plate, result);

                setResolvedPlate(plate);
                setData(mappedData);
                setFetchError("");
            } catch {
                if (cancelled) return;

                setResolvedPlate(plate);
                setData(null);
                setFetchError(t("errorLoadFailed"));
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadData();

        return () => {
            cancelled = true;
        };
    }, [plate, t]);

    const currentData = resolvedPlate === plate ? data : null;

    const error = !plate
        ? t("errorNoPlate")
        : !isValidPlateNo(plate)
            ? getPlateNoValidationMessage()
        : resolvedPlate === plate
            ? fetchError
            : "";

    const plateValue = currentData?.plate || plate || "-";

    return (
        <>
            <section className="detail-page">
                <div className="detail-page__content">
                    <div>
                        <BackBtn />
                    </div>

                    <header className="detail-page__header">
                        <h1>{t("title")}</h1>
                        <p>{t("subtitle")}</p>
                    </header>

                    <div className="detail-plate">
                        <div className="detail-plate-card">
                            <span className="detail-plate-card__label">
                                {t("plateLabel")}
                            </span>

                            <div className="detail-plate-card__input">
                                <span className="detail-plate-card__value">
                                    {plateValue}
                                </span>

                                <span
                                    className="detail-plate-card__edit detail-plate-card__edit--done"
                                    aria-hidden="true"
                                >
                                    <FaCheck />
                                </span>
                            </div>
                        </div>

                        <div className="detail-section-title">
                            {t("sectionTitle")}
                        </div>

                        {loading ? (
                            <div className="detail-error">
                                กำลังโหลดข้อมูล...
                            </div>
                        ) : null}

                        {error ? (
                            <div className="detail-error">
                                {error}
                            </div>
                        ) : null}

                        <div className="detail-info-grid">
                            <div className="detail-info-card">
                                <span className="detail-info-card__label">
                                    {t("dateLabel")}
                                </span>
                                <strong>{currentData?.date || "-"}</strong>
                            </div>

                            <div className="detail-info-card">
                                <span className="detail-info-card__label">
                                    {t("entryTimeLabel")}
                                </span>
                                <strong>{currentData?.entryTime || "-"}</strong>
                            </div>

                            <div className="detail-info-card">
                                <span className="detail-info-card__label">
                                    {t("durationLabel")}
                                </span>
                                <strong>{currentData?.duration || "-"}</strong>
                            </div>

                            <div className="detail-info-card detail-info-card--fee">
                                <div className="detail-info-card__fee-left">
                                    <span className="detail-info-card__label">
                                        {t("paymentStatusLabel")}
                                    </span>

                                    <strong className="detail-info-card__danger">
                                        {currentData?.paymentStatus || "-"}
                                    </strong>
                                </div>

                                <div className="detail-fee-box">
                                    <span>{t("serviceFee")}</span>

                                    <strong>
                                        {currentData?.amount != null
                                            ? `${currentData.amount} ${common("baht")}`
                                            : "-"}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="payment-panel">
                        <div className="payment-panel__content">
                            <h2>{t("paymentChannels")}</h2>

                            <p className="payment-panel__note">
                                {t("paymentNote")}
                            </p>

                            <div className="payment-card">
                                <div className="payment-card__top">
                                    <Image
                                        src="/icon/PromptPay-logo.png"
                                        alt="PromptPay"
                                        className="promptpay-logo__img"
                                        width={64}
                                        height={64}
                                        style={{ objectFit: "contain" }}
                                    />

                                    <div className="payment-card__tag">
                                        <span>FAST &amp; SECURE</span>
                                        <i />
                                    </div>
                                </div>

                                <div className="payment-card__body">
                                    <h3>{currentData?.paymentMethod || "-"}</h3>
                                    <p>{t("searchLicensePlate")}</p>
                                </div>

                                <div className="payment-card__button">
                                    <button
                                        type="button"
                                        onClick={() => setIsPopupOpen(true)}
                                        disabled={!currentData}
                                    >
                                        {common("continue")}
                                    </button>
                                    <FaChevronRight />
                                </div>
                            </div>

                            <div className="payment-panel__help">
                                <span>{t("paymentProblem")}</span>

                                <Link
                                    className="contact_staff"
                                    href="tel:+66123123456"
                                >
                                    <MdSupportAgent />
                                    <span>{common("contactStaff")}</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <PaymentPopup
                open={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                transaction={currentData?.raw ?? null}
                onSuccess={(payment: ClientPaymentResponse) => {
                    setData(mapKioskItemToDetailData(payment.transaction));
                    window.setTimeout(() => {
                        router.replace("/landing/dashboard");
                    }, 3000);
                }}
            />
        </>
    );
}

export default DetailPage;
