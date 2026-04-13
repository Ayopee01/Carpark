"use client";

import { FiRefreshCw, FiHeadphones } from "react-icons/fi";
import { useTranslations } from "next-intl";
import "@/src/app/css/PlateNotFoundPopup.css";

type PlateNotFoundPopupProps = {
    open: boolean;
    onClose: () => void;
    onRetry: () => void;
};

function PlateNotFoundPopup({
    open,
    onClose,
    onRetry,
}: PlateNotFoundPopupProps) {
    const t = useTranslations("PlateNotFoundPopup");

    if (!open) return null;

    return (
        <div className="plate-popup-overlay" onClick={onClose}>
            <div
                className="plate-popup"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="plate-popup-title"
            >
                <div className="plate-popup__top">
                    <span className="plate-popup__dot" />
                    <span className="plate-popup__top-text">{t("topText")}</span>
                </div>

                <div className="plate-popup__card">
                    <h2 id="plate-popup-title" className="plate-popup__title">
                        {t("title")}
                    </h2>

                    <div className="plate-popup__icon-wrap">
                        <button
                            type="button"
                            className="plate-popup__icon-btn"
                            onClick={onRetry}
                            aria-label={t("retryAria")}
                        >
                            <FiRefreshCw />
                        </button>
                    </div>

                    <button
                        type="button"
                        className="plate-popup__retry-btn"
                        onClick={onRetry}
                    >
                        {t("retry")}
                    </button>

                    <div className="plate-popup__divider" />

                    <button
                        type="button"
                        className="plate-popup__contact-btn"
                        onClick={onClose}
                    >
                        <FiHeadphones />
                        <span>{t("contactStaff")}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PlateNotFoundPopup;