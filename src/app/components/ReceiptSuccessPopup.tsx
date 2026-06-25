"use client";

// Import Libraries
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
// CSS
import "@/src/app/css/ReceiptSuccessPopup.css";
// Icons
import { FiCheck, FiPrinter } from "react-icons/fi";

// ------------------------------- Config -------------------------------

// Config timing การปิด Popup auto (วินาที)
const AUTO_CLOSE_SECONDS = 5;

// ------------------------------- Types -------------------------------
type ReceiptSuccessPopupProps = {
  open: boolean;
  onClose: () => void;
  exitTimeLimit?: string | null;
};

// ------------------------------- Function -------------------------------

// Function ตรวจสอบสถานะการเปิด Popup
function ReceiptSuccessPopup({
    open,
    onClose,
    exitTimeLimit,
}: ReceiptSuccessPopupProps) {
  if (!open) return null;

  return (
    <ReceiptSuccessPopupContent
      onClose={onClose}
      exitTimeLimit={exitTimeLimit}
    />
  );
}

// Function นับถอยหลังจากการเปิด Popup เมื่อแสดงผลแล้ว
function ReceiptSuccessPopupContent({
  onClose,
  exitTimeLimit,
}: Omit<ReceiptSuccessPopupProps, "open">) {
  const t = useTranslations("ReceiptSuccessPopup");
  const common = useTranslations("Common");
  const locale = useLocale();
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_SECONDS);
  const formattedExitTime = formatExitTime(exitTimeLimit ?? null, locale);

  // ------------------------------- useEffect -------------------------------

  useEffect(() => {
    const closeTimer = window.setTimeout(
      onClose,
      AUTO_CLOSE_SECONDS * 1000
    );
    const countdownTimer = window.setInterval(() => {
      setTimeLeft((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(closeTimer);
      window.clearInterval(countdownTimer);
    };
  }, [onClose]);

  // ----------------------------------- UI -----------------------------------
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

          <div className="receipt-popup__print-btn" aria-live="polite">
            <FiPrinter />
            {t("takeReceipt")}
          </div>

          <p className="receipt-popup__thankyou">{t("thankYou")}</p>
          {formattedExitTime ? (
            <p className="receipt-popup__exit-time">
              {t("exitWithin", { exitTimeLimit: formattedExitTime })}
            </p>
          ) : null}
          <p className="receipt-popup__countdown">
            {t("autoClose", { seconds: timeLeft })}
          </p>
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

function formatExitTime(value: string | null, locale: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(
    locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    }
  ).format(date);
}

export default ReceiptSuccessPopup;
