"use client";

import { FiCheck, FiPrinter } from "react-icons/fi";
import "@/src/app/css/ReceiptSuccessPopup.css";

type ReceiptSuccessPopupProps = {
  open: boolean;
  onClose: () => void;
  onPrint?: () => void;
};

export default function ReceiptSuccessPopup({
  open,
  onClose,
  onPrint,
}: ReceiptSuccessPopupProps) {
  if (!open) return null;

  return (
    <div className="receipt-popup-overlay">
      <div
        className="receipt-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-popup-title"
      >
        <div className="receipt-popup__header">
          <span className="receipt-popup__dot" />
          <h2 id="receipt-popup-title">ชำระค่าบริการสำเร็จ</h2>
        </div>

        <div className="receipt-popup__brand-card">
          <div className="receipt-popup__brand-icon">P</div>
          <h3>Smart Carpark</h3>
          <p>การชำระค่าบริการ</p>
        </div>

        <div className="receipt-popup__body-card">
          <h4>พิมพ์ใบเสร็จ</h4>

          <div className="receipt-popup__check-circle">
            <FiCheck />
          </div>

          <button
            type="button"
            className="receipt-popup__print-btn"
            onClick={onPrint}
          >
            <FiPrinter />
            กรุณารับใบเสร็จ
          </button>

          <p className="receipt-popup__thankyou">ขอบคุณที่ใช้บริการ</p>
          <span className="receipt-popup__line" />
        </div>

        <button
          type="button"
          className="receipt-popup__finish-btn"
          onClick={onClose}
        >
          เสร็จสิ้น
        </button>
      </div>
    </div>
  );
}