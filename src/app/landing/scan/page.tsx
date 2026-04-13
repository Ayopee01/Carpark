"use client";

// Import Libraries
import { useTranslations } from "next-intl";
// Components
import BackBtn from "@/src/app/components/BackBtn";
// CSS
import "@/src/app/css/Scan.css";
// Icons
import { MdOutlineQrCodeScanner } from "react-icons/md";

// ------------------------------- Function -------------------------------
function ScanPage() {
    const t = useTranslations("Scan");

    // ----------------------------------- UI -----------------------------------
    return (
        <section className="scan-page">
            <div className="scan-page__back">
                <BackBtn />
            </div>

            <div className="scan-page__content">
                <div className="scan-page__header">
                    <h1>Smart Carpark</h1>
                    <p>{t("subtitle")}</p>
                </div>

                <div className="scan-page__divider" />

                <div className="scan-box">
                    <span className="scan-box__corner scan-box__corner--tl" />
                    <span className="scan-box__corner scan-box__corner--tr" />
                    <span className="scan-box__corner scan-box__corner--bl" />
                    <span className="scan-box__corner scan-box__corner--br" />

                    <div className="scan-box__line" />

                    <div className="scan-box__icon">
                        <MdOutlineQrCodeScanner />
                    </div>
                </div>

                <p className="scan-page__hint">
                    {t("hintLine1")}
                    <br />
                    {t("hintLine2")}
                </p>
            </div>
        </section>
    );
}

export default ScanPage;