"use client";

import { useEffect, useState } from "react";
// Import Libraries
import { useLocale, useTranslations } from "next-intl";
// Libs
import { getActivatedDeviceType, getDeviceAuthHeaders, getDeviceId, handleDeviceResponseStatus } from "@/src/app/lib/device";
// Types
import type { ClientPaymentResponse, ClientTransactionResponse } from "@/src/app/type/client";
// CSS
import "@/src/app/css/PaymentPopup.css";
// Icons
import { BsQrCodeScan } from "react-icons/bs";
import { FiXCircle } from "react-icons/fi";

// ------------------------------- Types -------------------------------
type PaymentPopupProps = {
  open: boolean;
  onClose: () => void;
  transaction: ClientTransactionResponse | null;
  onSuccess?: (payment: ClientPaymentResponse) => void;
};

// ------------------------------- Function -------------------------------

// Function แสดง Popup สำหรับการชำระเงิน
function PaymentPopupContent({
  onClose,
  transaction,
  onSuccess,
}: Omit<PaymentPopupProps, "open">) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const t = useTranslations("PaymentPopup");
  const common = useTranslations("Common");
  const locale = useLocale();

  const numberLocale =
    locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "th-TH";

  // Config ค่า amount ให้เป็น 0 หาก transaction หรือ remainingAmount เป็น undefined
  const amount = transaction?.amount?.remainingAmount ?? 0;

  // Config ค่า qrImageSrc ให้เป็น path ของรูปภาพ QR Code
  const qrImageSrc = "/icon/Scanner_Viewfinder.png";

  // ------------------------------- useEffect -------------------------------

  // useEffect สำหรับป้องกันการ Scroll หน้าเมื่อ Popup เปิดอยู่
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // useEffect สำหรับ Countdown ของเวลาในการชำระเงิน
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = window.setTimeout(() => {
      setTimeLeft((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [timeLeft]);

  // useEffect สำหรับปิด Popup เมื่อ Countdown หมดเวลา
  useEffect(() => {
    if (timeLeft > 0) return;
    onClose();
  }, [onClose, timeLeft]);

  // ------------------------------- Function -------------------------------

  // Function สำหรับยืนยันการชำระเงิน
  const confirmPayment = async () => {
    if (!transaction || submitting) return;

      try {
      setSubmitting(true);
      setError("");
      const deviceType = getActivatedDeviceType();

      // ส่งข้อมูลไปยัง API สำหรับการชำระเงิน
      const response = await fetch("/api/client/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(deviceType ? getDeviceAuthHeaders(deviceType) : {}),
        },
        body: JSON.stringify({
          plateNo: transaction.plateNo,
          method: "qr",
          amount,
          deviceId: deviceType ? getDeviceId(deviceType) ?? undefined : undefined,
        }),
        cache: "no-store",
      });

      // ตรวจสอบผลลัพธ์จาก API และจัดการข้อผิดพลาด
      const result = (await response.json().catch(() => null)) as
        | ClientPaymentResponse
        | null;

      if (
        handleDeviceResponseStatus(
          response,
          result as { message?: string; status?: string } | null
        )
      ) {
        return;
      }

      if (!response.ok || !result?.transaction) {
        throw new Error(t("paymentFailed"));
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        onClose();
      }
    } catch (paymentError) {
      console.error("Payment failed:", paymentError);
      setError(
        t("paymentFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------- UI -----------------------------------

  return (
    <div
      className="payment-popup-overlay"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="payment-popup"
        onClick={(event) => event.stopPropagation()}
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
            <strong>{common("promptPay")}</strong>
          </div>

          <div className="payment-popup__qr-frame">
            <img
              className="payment-popup__qr-icon"
              src={qrImageSrc}
              alt={t("qrAlt")}
            />

            <div className="payment-popup__price">
              <span className="payment-popup__amount">
                {amount.toLocaleString(numberLocale)}
              </span>
              <span className="payment-popup__currency">
                {common("baht")}
              </span>
            </div>
          </div>
        </div>

        <div className="payment-popup__countdown">
          {t("payWithin")} <strong>{timeLeft}</strong> {common("seconds")}
        </div>

        {error ? <p className="payment-popup__error">{error}</p> : null}

        <button
          type="button"
          className="payment-popup__close-btn"
          onClick={() => void confirmPayment()}
          disabled={submitting || timeLeft <= 0 || !transaction}
        >
          <BsQrCodeScan />
          <span>{submitting ? t("confirming") : t("confirmPayment")}</span>
        </button>

        <button
          type="button"
          className="payment-popup__close-btn"
          onClick={onClose}
          disabled={submitting}
        >
          <FiXCircle />
          <span>{t("cancel")}</span>
        </button>
      </div>
    </div>
  );
}

// ------------------------------- Export -------------------------------

// Function สำหรับแสดง Popup สำหรับการชำระเงิน โดยตรวจสอบว่า Popup เปิดอยู่หรือไม่ และมี transaction หรือไม่
export default function PaymentPopup(props: PaymentPopupProps) {
  // ตรวจสอบว่า Popup เปิดอยู่หรือไม่ และมี transaction หรือไม่ หากไม่ตรงตามเงื่อนไขให้ return null
  if (!props.open || !props.transaction) return null;

  // Return Component PaymentPopupContent พร้อม props ที่ส่งเข้ามา
  return <PaymentPopupContent {...props} />;
}
