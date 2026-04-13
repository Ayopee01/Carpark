"use client";

import { FiCheck, FiPrinter } from "react-icons/fi";
import { useTranslations } from "next-intl";
import "@/src/app/css/ReceiptSuccessPopup.css";

type ReceiptSuccessPopupProps = {
  open: boolean;
  onClose: () => void;
  onPrint?: () => void;
};

function ReceiptSuccessPopup({
  open,
  onClose,
  onPrint,
}: ReceiptSuccessPopupProps) {
  const t = useTranslations("ReceiptSuccessPopup");
  const common = useTranslations("Common");

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
          <h2 id="receipt-popup-title">{t("title")}</h2>
        </div>

        <div className="receipt-popup__brand-card">
          <div className="receipt-popup__brand-icon">P</div>
          <h3>{common("smartCarpark")}</h3>
          <p>{common("paymentService")}</p>
        </div>

        <div className="receipt-popup__body-card">
          <h4>{t("printReceipt")}</h4>

          <div className="receipt-popup__check-circle">
            <FiCheck />
          </div>

          <button
            type="button"
            className="receipt-popup__print-btn"
            onClick={onPrint}
          >
            <FiPrinter />
            {t("takeReceipt")}
          </button>

          <p className="receipt-popup__thankyou">{t("thankYou")}</p>
          <span className="receipt-popup__line" />
        </div>

        <button
          type="button"
          className="receipt-popup__finish-btn"
          onClick={onClose}
        >
          {t("finish")}
        </button>
      </div>
    </div>
  );
}

export default ReceiptSuccessPopup;