"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
// Import Libraries
import { useTranslations } from "next-intl";
// Components
import BackBtn from "@/src/app/components/BackBtn";
import PaymentPopup from "@/src/app/components/PaymentPopup";
// CSS
import "@/src/app/css/Detail.css";
// Icons
import { FaCheck, FaChevronRight } from "react-icons/fa";
import { MdSupportAgent } from "react-icons/md";

// ------------------------------- Types -------------------------------
type DetailData = {
    plate: string;
    province: string;
    date: string;
    entryTime: string;
    duration: string;
    paymentStatus: string;
    amount: number;
    paymentMethod: string;
};

// ------------------------------- Function -------------------------------
function DetailPage() {
    const searchParams = useSearchParams();
    const plate = searchParams.get("plate") ?? "";

    const t = useTranslations("Detail");
    const common = useTranslations("Common");

    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [data, setData] = useState<DetailData | null>(null);
    const [fetchError, setFetchError] = useState("");
    const [resolvedPlate, setResolvedPlate] = useState("");

    // ------------------------------- API Call -------------------------------
    useEffect(() => {
        if (!plate) return;

        let cancelled = false;

        const loadData = async () => {
            try {
                const res = await fetch(
                    `/api/mockdata?plate=${encodeURIComponent(plate)}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                const result = await res.json();

                if (cancelled) return;

                if (!res.ok || !result.ok) {
                    setResolvedPlate(plate);
                    setData(null);
                    setFetchError(t("errorPlateNotFound"));
                    return;
                }

                setResolvedPlate(plate);
                setData(result.data);
                setFetchError("");
            } catch {
                if (cancelled) return;

                setResolvedPlate(plate);
                setData(null);
                setFetchError(t("errorLoadFailed"));
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, [plate, t]);

    const currentData = resolvedPlate === plate ? data : null;
    const error = !plate
        ? t("errorNoPlate")
        : resolvedPlate === plate
            ? fetchError
            : "";

    const plateValue = currentData?.plate || plate || "-";

    // ----------------------------------- UI -----------------------------------
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
                            <span className="detail-plate-card__label">{t("plateLabel")}</span>

                            <div className="detail-plate-card__input">
                                <span className="detail-plate-card__value">{plateValue}</span>

                                <span
                                    className="detail-plate-card__edit detail-plate-card__edit--done"
                                    aria-hidden="true"
                                >
                                    <FaCheck />
                                </span>
                            </div>
                        </div>

                        <div className="detail-section-title">{t("sectionTitle")}</div>

                        {error ? <div className="detail-error">{error}</div> : null}

                        <div className="detail-info-grid">
                            <div className="detail-info-card">
                                <span className="detail-info-card__label">{t("dateLabel")}</span>
                                <strong>{currentData?.date || "-"}</strong>
                            </div>

                            <div className="detail-info-card">
                                <span className="detail-info-card__label">{t("entryTimeLabel")}</span>
                                <strong>{currentData?.entryTime || "-"}</strong>
                            </div>

                            <div className="detail-info-card">
                                <span className="detail-info-card__label">{t("durationLabel")}</span>
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

                            <p className="payment-panel__note">{t("paymentNote")}</p>

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

                                <Link className="contact_staff" href="tel:+66123123456">
                                    <MdSupportAgent />
                                    <span >{common("contactStaff")}</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <PaymentPopup
                open={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                amount={currentData?.amount ?? 0}
            />
        </>
    );
}

export default DetailPage;