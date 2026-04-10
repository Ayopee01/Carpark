"use client";

import { FiRefreshCw, FiHeadphones } from "react-icons/fi";
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
                    <span className="plate-popup__top-text">ลองอีกครั้ง</span>
                </div>

                <div className="plate-popup__card">
                    <h2 id="plate-popup-title" className="plate-popup__title">
                        ไม่พบเลขทะเบียน
                    </h2>

                    <div className="plate-popup__icon-wrap">
                        <button
                            type="button"
                            className="plate-popup__icon-btn"
                            onClick={onRetry}
                            aria-label="ตรวจสอบอีกครั้ง"
                        >
                            <FiRefreshCw />
                        </button>
                    </div>

                    <button
                        type="button"
                        className="plate-popup__retry-btn"
                        onClick={onRetry}
                    >
                        ตรวจสอบอีกครั้ง
                    </button>

                    <div className="plate-popup__divider" />

                    <button
                        type="button"
                        className="plate-popup__contact-btn"
                        onClick={onClose}
                    >
                        <FiHeadphones />
                        <span>ติดต่อเจ้าหน้าที่</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PlateNotFoundPopup;