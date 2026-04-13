"use client";

import { useEffect, useState } from "react";
import { FiXCircle } from "react-icons/fi";
import { BsQrCodeScan } from "react-icons/bs";
import { useLocale, useTranslations } from "next-intl";
import "@/src/app/css/PaymentPopup.css";

type PaymentPopupProps = {
  open: boolean;
  onClose: () => void;
  amount?: number;
};

type PaymentPopupContentProps = {
  onClose: () => void;
  amount: number;
};

function PaymentPopupContent({ onClose, amount }: PaymentPopupContentProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const t = useTranslations("PaymentPopup");
  const common = useTranslations("Common");
  const locale = useLocale();

  const numberLocale =
    locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "th-TH";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onClose();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [timeLeft, onClose]);

  return (
    <div className="payment-popup-overlay" onClick={onClose}>
      <div
        className="payment-popup"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-popup-title"
      >
        <div className="payment-popup__header">
          <span className="payment-popup__dot" />
          <h2 id="payment-popup-title">{t("title")}</h2>
        </div>

        <div className="payment-popup__card">
          <div className="payment-popup__brand">
            <div className="payment-popup__brand-icon">P</div>
            <h3>{common("smartCarpark")}</h3>
            <p>{common("paymentService")}</p>
            <strong>PromptPay</strong>
          </div>

          <div className="payment-popup__qr-frame">
            <div className="payment-popup__qr-icon">
              <BsQrCodeScan />
            </div>

            <div className="payment-popup__amount">
              {amount.toLocaleString(numberLocale)}
            </div>
            <div className="payment-popup__currency">{common("baht")}</div>
            <p className="payment-popup__caption">{t("caption")}</p>
          </div>
        </div>

        <div className="payment-popup__countdown">
          {t("payWithin")} <strong>{timeLeft}</strong> {common("seconds")}
        </div>

        <button
          type="button"
          className="payment-popup__close-btn"
          onClick={onClose}
        >
          <FiXCircle />
          <span>{t("cancel")}</span>
        </button>
      </div>
    </div>
  );
}

function PaymentPopup({ open, onClose, amount = 80 }: PaymentPopupProps) {
  if (!open) return null;
  return <PaymentPopupContent onClose={onClose} amount={amount} />;
}

export default PaymentPopup;