"use client";

import Image from "next/image";
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
            <div className="scan-page__content">
                <div>
                    <BackBtn />
                </div>
                <div className="scan-page__header">
                    <h1>Smart Carpark</h1>
                    <p>{t("subtitle")}</p>
                </div>

                <div className="scan-page__icon">
                    <div
                        className="scan-page__divider">
                    </div>
                    <Image
                        src="/icon/Scanner_Viewfinder.png"
                        alt="scanner viewfinder"
                        className="scan-page__viewfinder"
                        width={384}
                        height={338}
                    />
                </div>

                <div className="scan-page__hint">
                    <p>
                        {t("hintLine1")}
                    </p>
                    <p>
                        {t("hintLine2")}
                    </p>
                </div>
            </div>
        </section>
    );
}

export default ScanPage;