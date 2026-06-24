"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

// Components
import BackBtn from "@/src/app/components/BackBtn";
import PlateNotFoundPopup from "@/src/app/components/PlateNotFoundPopup";
import PaymentPopup from "@/src/app/components/PaymentPopup";
import ReceiptSuccessPopup from "@/src/app/components/ReceiptSuccessPopup";
import { normalizePlateNo } from "@/src/app/lib/plate";
import {
    getActivatedDeviceType,
    getDeviceAuthHeaders,
    getDeviceId,
    handleDeviceResponseStatus,
} from "@/src/app/lib/device";
import {
    BARRIER_RETURN_STORAGE_KEY,
} from "@/src/app/lib/storageKeys";
import { savePlateTransactionResult } from "@/src/app/lib/transactionStorage";
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

// ------------------------------- Helpers -------------------------------
function getDateLocale(locale: string) {
    if (locale === "zh") return "zh-CN";
    if (locale === "en") return "en-US";
    return "th-TH-u-ca-buddhist";
}

function formatDate(value: string | null, locale: string) {
    if (!value) return "-";
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(getDateLocale(locale), {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Bangkok",
    }).format(date);
}

function formatTime(value: string | null, locale: string) {
    if (!value) return "-";
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(date);
}

type DurationParts = {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
};

type DurationPartKey =
    | "durationYear"
    | "durationMonth"
    | "durationDay"
    | "durationHour"
    | "durationMinute";

function addYears(date: Date, years: number) {
    const next = new Date(date);
    const month = next.getMonth();
    next.setFullYear(next.getFullYear() + years);

    if (next.getMonth() !== month) {
        next.setDate(0);
    }

    return next;
}

function addMonths(date: Date, months: number) {
    const next = new Date(date);
    const month = next.getMonth();
    next.setMonth(next.getMonth() + months);

    if (next.getMonth() !== (month + months) % 12) {
        next.setDate(0);
    }

    return next;
}

function countCalendarUnits(
    start: Date,
    end: Date,
    addUnit: (date: Date, value: number) => Date
) {
    let count = 0;
    let cursor = new Date(start);

    while (true) {
        const next = addUnit(cursor, 1);
        if (next.getTime() > end.getTime()) break;

        cursor = next;
        count += 1;
    }

    return { count, cursor };
}

function durationPartsFromDates(startValue: string | null, endValue: string | null) {
    if (!startValue || !endValue) return null;

    const start = new Date(startValue);
    const end = new Date(endValue);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end.getTime() <= start.getTime()
    ) {
        return null;
    }

    const years = countCalendarUnits(start, end, addYears);
    const months = countCalendarUnits(years.cursor, end, addMonths);
    const remainingMinutes = Math.floor(
        (end.getTime() - months.cursor.getTime()) / 60000
    );

    return durationPartsFromMinutes(remainingMinutes, {
        years: years.count,
        months: months.count,
    });
}

function durationPartsFromMinutes(
    totalMinutes: number,
    initial: Partial<Pick<DurationParts, "years" | "months">> = {}
): DurationParts | null {
    if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return null;

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return {
        years: initial.years ?? 0,
        months: initial.months ?? 0,
        days,
        hours,
        minutes,
    };
}

function formatDurationParts(
    parts: DurationParts | null,
    t: ReturnType<typeof useTranslations<"Detail">>
) {
    if (!parts) return "-";

    const hasDateUnit = parts.years > 0 || parts.months > 0 || parts.days > 0;
    const items: Array<[DurationPartKey, number]> = [];

    if (parts.years > 0) items.push(["durationYear", parts.years]);
    if (parts.months > 0) items.push(["durationMonth", parts.months]);
    if (parts.days > 0) items.push(["durationDay", parts.days]);

    if (hasDateUnit || parts.hours > 0) {
        items.push(["durationHour", parts.hours]);
    }

    if (hasDateUnit || parts.hours > 0 || parts.minutes > 0) {
        items.push(["durationMinute", parts.minutes]);
    }

    if (items.length === 0) {
        items.push(["durationMinute", 0]);
    }

    return items.map(([key, count]) => t(key, { count })).join(" ");
}

function formatDuration(
    item: ClientTransactionResponse,
    t: ReturnType<typeof useTranslations<"Detail">>
) {
    let durationEndAt = item.calculatedAt;

    const totalMinutes = item.duration?.totalMinutes ?? 0;

    if (!durationEndAt && item.entryAt && Number.isFinite(totalMinutes)) {
        const start = new Date(item.entryAt);

        if (!Number.isNaN(start.getTime())) {
            durationEndAt = new Date(
                start.getTime() + totalMinutes * 60000
            ).toISOString();
        }
    }

    const fromDates = durationPartsFromDates(item.entryAt, durationEndAt);

    if (fromDates) {
        return formatDurationParts(fromDates, t);
    }

    return formatDurationParts(
        durationPartsFromMinutes(totalMinutes),
        t
    );
}

function getPaymentStatusLabel(
    status: string,
    t: ReturnType<typeof useTranslations<"Detail">>
) {
    switch (status) {
        case "pending":
            return t("statusPending");
        case "partially_paid":
            return t("statusPartiallyPaid");
        case "paid_waiting_exit":
            return t("statusPaidWaitingExit");
        case "completed":
            return t("statusCompleted");
        case "cancelled":
            return t("statusCancelled");
        default:
            return status || "-";
    }
}

function mapKioskItemToDetailData(
    item: ClientTransactionResponse,
    locale: string,
    t: ReturnType<typeof useTranslations<"Detail">>
): DetailData {
    return {
        id: item.transactionId,
        billNo: item.billNo,
        plate: item.plateNo,
        province: "-",
        date: formatDate(item.entryAt, locale),
        entryTime: formatTime(item.entryAt, locale),
        duration: formatDuration(item, t),
        paymentStatus: getPaymentStatusLabel(item.status, t),
        amount: item.amount?.remainingAmount ?? 0,
        paymentMethod: item.qrData ? "PromptPay / QR Code" : "PromptPay",
        qrData: item.qrData,
        raw: item,
    };
}

// ------------------------------- Component -------------------------------
function DetailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const locale = useLocale();
    const plate = normalizePlateNo(
        searchParams.get("plateNo") ?? searchParams.get("plate") ?? ""
    );
    const t = useTranslations("Detail");
    const common = useTranslations("Common");

    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [isReceiptPopupOpen, setIsReceiptPopupOpen] = useState(false);
    const [data, setData] = useState<DetailData | null>(null);
    const [fetchError, setFetchError] = useState("");
    const [resolvedPlate, setResolvedPlate] = useState("");
    const [loading, setLoading] = useState(false);
    const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);

    useEffect(() => {
        if (!plate) return;

        let cancelled = false;

        const loadData = async () => {
            try {
                setLoading(true);
                setFetchError("");
                setShowNotFoundPopup(false);

                const deviceType = getActivatedDeviceType() ?? "kiosk";
                const deviceId = getDeviceId(deviceType)?.trim() ?? "";
                const query = new URLSearchParams({
                    plateNo: plate,
                    deviceId,
                });

                const response = await fetch(
                    `/api/client/transaction?${query.toString()}`,
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

                if (response.status === 404) {
                    setResolvedPlate(plate);
                    setData(null);
                    setShowNotFoundPopup(true);
                    return;
                }

                if (!response.ok || !result) {
                    setResolvedPlate(plate);
                    setData(null);
                    setFetchError(t("errorLoadFailed"));
                    return;
                }

                const mappedData = mapKioskItemToDetailData(result, locale, t);

                savePlateTransactionResult(plate, result);

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
    }, [locale, plate, t]);

    const currentData = resolvedPlate === plate ? data : null;

    const error = !plate
        ? t("errorNoPlate")
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
                                {t("loading")}
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
                                        <span>{t("fastSecure")}</span>
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
                    setIsPopupOpen(false);

                    try {
                        setData(mapKioskItemToDetailData(payment.transaction, locale, t));
                    } catch (error) {
                        console.warn("Unable to update detail after payment:", error);
                    }

                    window.setTimeout(() => {
                        setIsReceiptPopupOpen(true);
                    }, 0);
                }}
            />

            <ReceiptSuccessPopup
                open={isReceiptPopupOpen}
                onClose={() => {
                    setIsReceiptPopupOpen(false);
                    const barrierReturnUrl = sessionStorage.getItem(
                        BARRIER_RETURN_STORAGE_KEY
                    );

                    if (barrierReturnUrl?.startsWith("/landing/barrier-gate")) {
                        sessionStorage.removeItem(BARRIER_RETURN_STORAGE_KEY);
                        router.replace(barrierReturnUrl);
                        return;
                    }

                    router.replace("/landing/dashboard");
                }}
            />

            <PlateNotFoundPopup
                open={showNotFoundPopup}
                onClose={() => setShowNotFoundPopup(false)}
                onRetry={() => setShowNotFoundPopup(false)}
            />
        </>
    );
}

export default DetailPage;
