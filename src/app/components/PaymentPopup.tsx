"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BsQrCodeScan } from "react-icons/bs";
import { FiXCircle } from "react-icons/fi";
import {
  getDeviceAuthHeaders,
  getDeviceId,
  handleDeviceResponseStatus,
} from "@/src/app/lib/device";
import type {
  ClientPaymentResponse,
  ClientTransactionResponse,
} from "@/src/app/type/client";
import "@/src/app/css/PaymentPopup.css";

type PaymentPopupProps = {
  open: boolean;
  onClose: () => void;
  transaction: ClientTransactionResponse | null;
  onSuccess?: (payment: ClientPaymentResponse) => void;
};

function getErrorMessage(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }
  return "ไม่สามารถชำระเงินได้ กรุณาลองใหม่";
}

function PaymentPopupContent({
  onClose,
  transaction,
  onSuccess,
}: Omit<PaymentPopupProps, "open">) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ClientPaymentResponse | null>(null);
  const t = useTranslations("PaymentPopup");
  const common = useTranslations("Common");
  const locale = useLocale();
  const numberLocale =
    locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "th-TH";
  const amount = transaction?.amount.remainingAmount ?? 0;
  // TODO: Production จริงให้เปลี่ยนเป็น QR Code ที่ได้จาก Payment Gateway
  const qrImageSrc = "/icon/Scanner_Viewfinder.png";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (success || timeLeft <= 0) return;
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [success, timeLeft]);

  useEffect(() => {
    if (success || timeLeft > 0) return;
    onClose();
  }, [onClose, success, timeLeft]);

  const confirmPayment = async () => {
    if (!transaction || submitting || success) return;

    try {
      setSubmitting(true);
      setError("");
      const response = await fetch("/api/client/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDeviceAuthHeaders("kiosk"),
        },
        body: JSON.stringify({
          transactionId: transaction.transactionId,
          plateNo: transaction.plateNo,
          method: "qr",
          amount,
          deviceId: getDeviceId("kiosk") ?? undefined,
        }),
        cache: "no-store",
      });
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
        throw new Error(getErrorMessage(result));
      }

      setSuccess(result);
      onSuccess?.(result);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "ไม่สามารถชำระเงินได้ กรุณาลองใหม่"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="payment-popup-overlay" onClick={success ? undefined : onClose}>
      <div
        className="payment-popup"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-popup-title"
      >
        <div className="payment-popup__header">
          <span className="payment-popup__dot" />
          <h2 id="payment-popup-title">
            {success ? "ชำระเงินสำเร็จ" : t("title")}
          </h2>
        </div>

        {success ? (
          <div className="payment-popup__card">
            <h3>{success.message}</h3>
            <p>ทะเบียน {success.transaction.plateNo}</p>
            <p>
              เวลาออกภายใน {success.transaction.exitTimeLimit ?? "-"}
            </p>
            <p>กำลังกลับสู่หน้าหลัก...</p>
          </div>
        ) : (
          <>
            <div className="payment-popup__card">
              <div className="payment-popup__brand">
                <div className="payment-popup__brand-icon">P</div>
                <h3>{common("smartCarpark")}</h3>
                <p>{common("paymentService")}</p>
                <strong>PromptPay</strong>
              </div>

              <div className="payment-popup__qr-frame">
                <img className="payment-popup__qr-icon" src={qrImageSrc} alt="Payment QR code placeholder" />

                <div className="payment-popup__amount">
                  {amount.toLocaleString(numberLocale)}
                </div>

                <div className="payment-popup__currency">{common("baht")}</div>
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
              <span>{submitting ? "กำลังยืนยัน..." : "ยืนยันการชำระเงิน"}</span>
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
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentPopup(props: PaymentPopupProps) {
  if (!props.open || !props.transaction) return null;
  return <PaymentPopupContent {...props} />;
}
