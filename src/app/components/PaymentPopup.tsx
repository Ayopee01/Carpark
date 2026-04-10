"use client";

import { useEffect, useState } from "react";
import { FiXCircle } from "react-icons/fi";
import { BsQrCodeScan } from "react-icons/bs";
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

function PaymentPopupContent({
  onClose,
  amount,
}: PaymentPopupContentProps) {
  const [timeLeft, setTimeLeft] = useState(60);

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
          <h2 id="payment-popup-title">ชำระค่าบริการ</h2>
        </div>

        <div className="payment-popup__card">
          <div className="payment-popup__brand">
            <div className="payment-popup__brand-icon">P</div>
            <h3>Smart Carpark</h3>
            <p>การชำระค่าบริการ</p>
            <strong>PromptPay</strong>
          </div>

          <div className="payment-popup__qr-frame">
            <div className="payment-popup__qr-icon">
              <BsQrCodeScan />
            </div>

            <div className="payment-popup__amount">
              {amount.toLocaleString("th-TH")}
            </div>
            <div className="payment-popup__currency">บาท</div>
            <p className="payment-popup__caption">สแกนเพื่อชำระค่าบริการ</p>
          </div>
        </div>

        <div className="payment-popup__countdown">
          กรุณาชำระเงินภายใน <strong>{timeLeft}</strong> วินาที
        </div>

        <button
          type="button"
          className="payment-popup__close-btn"
          onClick={onClose}
        >
          <FiXCircle />
          <span>ยกเลิก</span>
        </button>
      </div>
    </div>
  );
}

function PaymentPopup({
  open,
  onClose,
  amount = 80,
}: PaymentPopupProps) {
  if (!open) return null;

  return <PaymentPopupContent onClose={onClose} amount={amount} />;
}

export default PaymentPopup;