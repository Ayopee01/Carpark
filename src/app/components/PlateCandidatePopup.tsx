"use client";

// Import Libraries
import { useTranslations } from "next-intl";
// Types
import type { ClientTransactionCandidate } from "@/src/app/type/client";
// CSS
import "@/src/app/css/PlateCandidatePopup.css";

// ------------------------------- Types -------------------------------
type PlateCandidatePopupProps = {
    open: boolean;
    candidates: ClientTransactionCandidate[];
    onClose: () => void;
    onSelect: (plateNo: string) => void;
};

// ------------------------------- Helpers -------------------------------
function formatEntryAt(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(date);
}

// ------------------------------- Function -------------------------------

// Function แสดง Popup สำหรับเลือกทะเบียนเมื่อค้นหาแล้วพบหลายรายการ
function PlateCandidatePopup({
    open,
    candidates,
    onClose,
    onSelect,
}: PlateCandidatePopupProps) {
    const t = useTranslations("PlateCandidatePopup");

    if (!open) return null;

    // ----------------------------------- UI -----------------------------------
    return (
        <div className="plate-candidate-popup__overlay" onClick={onClose}>
            <div
                className="plate-candidate-popup"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="plate-candidate-popup-title"
            >
                <div className="plate-candidate-popup__top">
                    <span className="plate-candidate-popup__dot" />
                    <span>{t("topText")}</span>
                </div>

                <div className="plate-candidate-popup__card">
                    <h2 id="plate-candidate-popup-title">
                        {t("title")}
                    </h2>
                    <p>{t("subtitle")}</p>

                    <div className="plate-candidate-popup__list">
                        {candidates.map((candidate) => (
                            <button
                                key={`${candidate.plateNo}-${candidate.billNo}`}
                                type="button"
                                className="plate-candidate-popup__item"
                                onClick={() => onSelect(candidate.plateNo)}
                            >
                                <span className="plate-candidate-popup__plate">
                                    {candidate.plateNo}
                                </span>
                                {/* กรณีต้องการแสดง billNo */}
                                {/* <span className="plate-candidate-popup__meta">
                                    {candidate.billNo}
                                </span> */}
                                <span className="plate-candidate-popup__meta">
                                    {t("entryAt", {
                                        value: formatEntryAt(candidate.entryAt),
                                    })}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="plate-candidate-popup__cancel"
                        onClick={onClose}
                    >
                        {t("cancel")}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PlateCandidatePopup;
