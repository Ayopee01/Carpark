"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

// Libs
import {
  getDeviceAuthHeaders,
  getStoredDeviceCredential,
  handleDeviceResponseStatus,
  type UiDeviceType,
} from "@/src/app/lib/device";
import { formatExitTime } from "@/src/app/lib/date";
import {
  buildPaymentWebSocketUrl,
  buildSuccessfulPayment,
  buildSuccessfulPaymentFromTransaction,
  isTransactionPaid,
  normalizePaymentUpdatedEvent,
  type OmisePaymentUpdatePayload,
} from "@/src/app/lib/payment/paymentStatus";

// Components
import PlateCandidatePopup from "@/src/app/components/PlateCandidatePopup";

// Types
import type {
  ClientPaymentResponse,
  ClientTransactionResponse,
  ClientTransactionCandidate,
  DeviceType,
  OmiseChargeResponse,
  OmisePaymentUpdatedEvent,
} from "@/src/app/type/client";

// CSS
import "@/src/app/css/PaymentPopup.css";

// Icons
import { BsQrCodeScan } from "react-icons/bs";
import { FiXCircle } from "react-icons/fi";

declare global {
  interface Window {
    Omise?: {
      setPublicKey: (publicKey: string) => void;
      createSource: (
        type: "promptpay",
        options: { amount: number; currency: "thb" },
        callback: (statusCode: number, response: { id?: string; message?: string }) => void
      ) => void;
    };
  }
}

type PaymentPopupProps = {
  open: boolean;
  onClose: () => void;
  transaction: ClientTransactionResponse | null;
  onSuccess?: (payment: ClientPaymentResponse) => void;
  paymentDeviceId?: string | null;
  paymentDeviceType?: UiDeviceType;
};

type OmiseConfigResponse = {
  publicKey: string;
  paymentWebSocketUrl: string;
};

type PaymentStep = "idle" | "creating" | "waiting" | "successful" | "failed";

const PAYMENT_TIMEOUT_SECONDS = 60;
const PAYMENT_STATUS_POLL_MS = 3000;
const MIN_PROMPTPAY_AMOUNT_BAHT = 10;
const OMISE_SCRIPT_SRC = "https://cdn.omise.co/omise.js";
const paymentChargePromises = new Map<string, Promise<OmiseChargeResponse["charge"]>>();

function logPaymentDebug(
  level: "info" | "warn" | "error",
  message: string,
  data?: unknown
) {
  if (process.env.NODE_ENV === "production") return;
  console[level](message, data);
}

function loadOmiseScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Omise) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${OMISE_SCRIPT_SRC}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Omise.js")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = OMISE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Omise.js"));
    document.body.appendChild(script);
  });
}

function createPromptPaySource(amountSatang: number) {
  return new Promise<string>((resolve, reject) => {
    if (!window.Omise) {
      reject(new Error("Omise.js is not ready"));
      return;
    }

    window.Omise.createSource(
      "promptpay",
      {
        amount: amountSatang,
        currency: "thb",
      },
      (statusCode, response) => {
        if (statusCode >= 200 && statusCode < 300 && response.id) {
          resolve(response.id);
          return;
        }

        reject(new Error(response.message || "Unable to create PromptPay source"));
      }
    );
  });
}

function toNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstUrl(...values: unknown[]) {
  for (const value of values) {
    const url = toNonEmptyString(value);
    if (url) return url;
  }

  return null;
}

function resolveQrImage(charge?: OmiseChargeResponse["charge"] | null) {
  if (charge?.chargeId) {
    return `/api/client/payment/omise/qr?chargeId=${encodeURIComponent(
      charge.chargeId
    )}`;
  }

  return null;
}

function resolveAuthorizeUri(charge?: OmiseChargeResponse["charge"] | null) {
  return firstUrl(charge?.authorizeUri, charge?.authorize_uri);
}

function getBackendErrorMessage(
  response: Response,
  result: { message?: string } | null,
  fallbackMessage: string
) {
  if (response.status === 400 && result?.message) return result.message;
  if (response.status === 404) return result?.message || fallbackMessage;
  return fallbackMessage;
}

function toSatang(amount: number) {
  return Math.round(amount * 100);
}

function getPaymentClientType(
  paymentDeviceType?: UiDeviceType
): DeviceType | "mobile" {
  if (paymentDeviceType === "kiosk") return "kiosk";
  if (paymentDeviceType === "barrier-gate") return "barrier_gate";

  const credential = getStoredDeviceCredential();
  if (credential?.deviceType === "kiosk") return "kiosk";
  if (credential?.deviceType === "barrier_gate") return "barrier_gate";
  return "mobile";
}

async function createPaymentCharge({
  amountSatang,
  deviceId,
  deviceType,
  plateNo,
  publicKey,
}: {
  amountSatang: number;
  deviceId: string | null;
  deviceType?: UiDeviceType;
  plateNo: string;
  publicKey: string;
}) {
  await loadOmiseScript();

  if (!window.Omise) {
    throw new Error("Omise.js is not ready");
  }

  window.Omise.setPublicKey(publicKey);
  const sourceId = await createPromptPaySource(amountSatang);

  const response = await fetch("/api/client/payment/omise/charge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(deviceId ? getDeviceAuthHeaders(deviceType) : {}),
    },
    body: JSON.stringify({
      plateNo,
      source: sourceId,
      sourceType: "promptpay",
      method: "promptpay",
      ...(deviceId ? { deviceId } : {}),
    }),
    cache: "no-store",
  });

  const result = (await response.json().catch(() => null)) as
    | OmiseChargeResponse
    | { message?: string; status?: string; candidates?: ClientTransactionCandidate[] }
    | null;

  if (
    handleDeviceResponseStatus(
      response,
      result as { message?: string; status?: string } | null
    )
  ) {
    throw new Error("Device status changed");
  }

  if (!response.ok || !result || !("charge" in result)) {
    const error = new Error(
      getBackendErrorMessage(
        response,
        result as { message?: string } | null,
        "Unable to create payment charge"
      )
    ) as Error & {
      status?: number;
      candidates?: ClientTransactionCandidate[];
    };

    error.status = response.status;

    if (
      response.status === 409 &&
      result &&
      "candidates" in result &&
      Array.isArray(result.candidates)
    ) {
      error.candidates = result.candidates;
    }

    throw error;
  }

  return result.charge;
}

function getPaymentChargeSessionKey({
  amountSatang,
  deviceId,
  deviceType,
  plateNo,
}: {
  amountSatang: number;
  deviceId: string | null;
  deviceType?: UiDeviceType;
  plateNo: string;
}) {
  return `${deviceType ?? "mobile"}:${deviceId ?? "mobile"}:${plateNo}:${amountSatang}`;
}

function getOrCreatePaymentCharge(options: {
  amountSatang: number;
  deviceId: string | null;
  deviceType?: UiDeviceType;
  plateNo: string;
  publicKey: string;
}) {
  const sessionKey = getPaymentChargeSessionKey(options);
  const existingPromise = paymentChargePromises.get(sessionKey);

  if (existingPromise) {
    return existingPromise;
  }

  const promise = createPaymentCharge(options).catch((error) => {
    paymentChargePromises.delete(sessionKey);
    throw error;
  });

  paymentChargePromises.set(sessionKey, promise);
  window.setTimeout(() => {
    paymentChargePromises.delete(sessionKey);
  }, PAYMENT_TIMEOUT_SECONDS * 1000);

  return promise;
}

function PaymentPopupContent({
  onClose,
  transaction,
  onSuccess,
  paymentDeviceId,
  paymentDeviceType,
}: Omit<PaymentPopupProps, "open">) {
  const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT_SECONDS);
  const [step, setStep] = useState<PaymentStep>("idle");
  const [error, setError] = useState("");
  const [charge, setCharge] = useState<OmiseChargeResponse["charge"] | null>(null);
  const [candidates, setCandidates] = useState<ClientTransactionCandidate[]>([]);
  const [exitTimeLimit, setExitTimeLimit] = useState<string | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const hasStartedPaymentRef = useRef(false);

  const t = useTranslations("PaymentPopup");
  const common = useTranslations("Common");
  const locale = useLocale();

  const numberLocale =
    locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "th-TH";

  const amount = transaction?.amount?.remainingAmount ?? 0;
  const amountSatang = useMemo(() => toSatang(amount), [amount]);
  const qrImageSrc = resolveQrImage(charge);
  const authorizeUri = resolveAuthorizeUri(charge);
  const canCreatePayment = step === "idle" || step === "failed";
  const isBusy = step === "creating" || step === "waiting";
  const formattedExitTime = formatExitTime(exitTimeLimit, locale);

  const closePaymentSocket = useCallback(() => {
    webSocketRef.current?.close();
    webSocketRef.current = null;
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      closePaymentSocket();
    };
  }, [closePaymentSocket]);

  useEffect(() => {
    if (timeLeft <= 0 || step === "successful") return;

    const timer = window.setTimeout(() => {
      setTimeLeft((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [step, timeLeft]);

  useEffect(() => {
    if (timeLeft > 0 || step === "successful") return;

    closePaymentSocket();
    onClose();
  }, [closePaymentSocket, onClose, step, timeLeft]);

  const handlePaymentUpdated = useCallback(
    (event: OmisePaymentUpdatedEvent) => {
      if (!transaction || event.chargeId !== charge?.chargeId) return;

      if (event.paymentStatus === "successful") {
        closePaymentSocket();
        setStep("successful");
        setExitTimeLimit(event.exitTimeLimit);

        onSuccess?.(
          buildSuccessfulPayment(
            transaction,
            event,
            getPaymentClientType(paymentDeviceType)
          )
        );
        return;
      }

      if (event.paymentStatus === "failed" || event.paymentStatus === "expired") {
        closePaymentSocket();
        setStep("failed");
        setError(t("paymentFailed"));
      }
    },
    [charge?.chargeId, closePaymentSocket, onSuccess, paymentDeviceType, t, transaction]
  );

  useEffect(() => {
    if (step !== "waiting" || !transaction) return;

    let cancelled = false;
    let pollTimer: number | null = null;

    const pollPaymentStatus = async () => {
      try {
        const credential = getStoredDeviceCredential();
        const deviceId =
          paymentDeviceId?.trim() ||
          (credential?.deviceType === "kiosk" ||
            credential?.deviceType === "barrier_gate"
            ? credential.deviceId.trim()
            : "");
        const requestDeviceType =
          paymentDeviceType ??
          (credential?.deviceType === "barrier_gate" ? "barrier-gate" : "kiosk");
        const query = new URLSearchParams({ plateNo: transaction.plateNo });

        if (deviceId) {
          query.set("deviceId", deviceId);
        }

        const response = await fetch(`/api/client/transaction?${query}`, {
          method: "GET",
          headers: deviceId ? getDeviceAuthHeaders(requestDeviceType) : {},
          cache: "no-store",
        });
        const result = (await response.json().catch(() => null)) as
          | ClientTransactionResponse
          | null;

        if (cancelled || !response.ok || !result || !isTransactionPaid(result)) {
          return;
        }

        cancelled = true;
        closePaymentSocket();
        setStep("successful");
        setExitTimeLimit(result.exitTimeLimit);
        onSuccess?.(
          buildSuccessfulPaymentFromTransaction(
            result,
            getPaymentClientType(requestDeviceType)
          )
        );
      } catch (pollError) {
        logPaymentDebug("warn", "Payment status polling failed:", pollError);
      } finally {
        if (!cancelled) {
          pollTimer = window.setTimeout(pollPaymentStatus, PAYMENT_STATUS_POLL_MS);
        }
      }
    };

    pollTimer = window.setTimeout(pollPaymentStatus, PAYMENT_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
      }
    };
  }, [closePaymentSocket, onSuccess, paymentDeviceId, paymentDeviceType, step, transaction]);

  useEffect(() => {
    if (!charge?.chargeId || step !== "waiting" || !transaction) return;

    let cancelled = false;
    let paymentWebSocketUrl = "";

    const connectPaymentSocket = async () => {
      try {
        if (!paymentWebSocketUrl) {
          const configResponse = await fetch("/api/client/payment/omise/config", {
            method: "GET",
            cache: "no-store",
          });
          const config = (await configResponse.json().catch(() => null)) as
            | OmiseConfigResponse
            | null;

          if (!configResponse.ok || !config?.paymentWebSocketUrl || cancelled) {
            throw new Error("Payment WebSocket config is not available");
          }

          paymentWebSocketUrl = config.paymentWebSocketUrl;
        }

        if (cancelled) return;

        const socket = new WebSocket(
          buildPaymentWebSocketUrl(paymentWebSocketUrl, charge.chargeId)
        );
        webSocketRef.current = socket;

        socket.onopen = () => {
          logPaymentDebug("info", "Payment WebSocket connected", {
            chargeId: charge.chargeId,
          });
        };

        socket.onmessage = (message) => {
          const data = JSON.parse(message.data) as OmisePaymentUpdatePayload;
          const paymentEvent = normalizePaymentUpdatedEvent(
            data,
            charge.chargeId,
            transaction
          );

          if (paymentEvent) {
            cancelled = true;
            handlePaymentUpdated(paymentEvent);
          }
        };

        socket.onerror = (event) => {
          logPaymentDebug("warn", "Payment WebSocket error", {
            chargeId: charge.chargeId,
            event,
          });
        };

        socket.onclose = (event) => {
          if (webSocketRef.current === socket) {
            webSocketRef.current = null;
          }

          logPaymentDebug("warn", "Payment WebSocket closed", {
            chargeId: charge.chargeId,
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });
        };
      } catch (socketError) {
        logPaymentDebug("error", "Payment WebSocket failed:", socketError);
      }
    };

    void connectPaymentSocket();

    return () => {
      cancelled = true;
      closePaymentSocket();
    };
  }, [
    charge?.chargeId,
    closePaymentSocket,
    handlePaymentUpdated,
    step,
    transaction,
  ]);

  const startPaymentSession = useCallback(async () => {
    if (!transaction || !canCreatePayment || amountSatang <= 0) return;

    if (amount <= MIN_PROMPTPAY_AMOUNT_BAHT) {
      closePaymentSocket();
      setStep("failed");
      setCharge(null);
      setExitTimeLimit(null);
      setError(t("minimumAmountCashier"));
      return;
    }

    try {
      closePaymentSocket();
      setStep("creating");
      setError("");
      setCharge(null);
      setExitTimeLimit(null);
      setTimeLeft(PAYMENT_TIMEOUT_SECONDS);

      const credential = getStoredDeviceCredential();
      const deviceId =
        paymentDeviceId?.trim() ||
        (credential?.deviceType === "kiosk" ||
          credential?.deviceType === "barrier_gate"
          ? credential.deviceId.trim()
          : null);
      const requestDeviceType =
        paymentDeviceType ??
        (credential?.deviceType === "barrier_gate" ? "barrier-gate" : "kiosk");

      const configResponse = await fetch("/api/client/payment/omise/config", {
        method: "GET",
        cache: "no-store",
      });
      const config = (await configResponse.json().catch(() => null)) as
        | OmiseConfigResponse
        | null;

      if (!configResponse.ok || !config?.publicKey) {
        throw new Error(t("paymentFailed"));
      }

      const nextCharge = await getOrCreatePaymentCharge({
        amountSatang,
        deviceId,
        deviceType: requestDeviceType,
        plateNo: transaction.plateNo,
        publicKey: config.publicKey,
      });

      setCharge(nextCharge);
      setStep("waiting");
    } catch (paymentError) {
      logPaymentDebug("error", "Payment failed:", paymentError);
      closePaymentSocket();
      setStep("failed");

      const errorWithCandidates = paymentError as Error & {
        candidates?: ClientTransactionCandidate[];
      };

      if (Array.isArray(errorWithCandidates.candidates)) {
        setCandidates(errorWithCandidates.candidates);
        return;
      }

      setError(
        paymentError instanceof Error ? paymentError.message : t("paymentFailed")
      );
    }
  }, [
    amountSatang,
    amount,
    canCreatePayment,
    closePaymentSocket,
    paymentDeviceId,
    paymentDeviceType,
    t,
    transaction,
  ]);

  useEffect(() => {
    if (hasStartedPaymentRef.current) return;
    hasStartedPaymentRef.current = true;
    void startPaymentSession();
  }, [startPaymentSession]);

  const paymentButtonText =
    step === "creating" ? t("creatingQr") : t("waitingVerification");

  return (
    <>
      <div
        className="payment-popup-overlay"
        onClick={isBusy ? undefined : onClose}
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
              {qrImageSrc ? (
                <img
                  className="payment-popup__qr-icon"
                  src={qrImageSrc}
                  alt={t("qrAlt")}
                />
              ) : (
                <div className="payment-popup__qr-empty">
                  {step === "creating" ? t("creatingQr") : t("qrUnavailable")}
                </div>
              )}

              {authorizeUri && !resolveQrImage(charge) ? (
                <a
                  className="payment-popup__link"
                  href={authorizeUri}
                  target="_blank"
                  rel="noreferrer"
                >
                  {common("promptPay")}
                </a>
              ) : null}

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

          {formattedExitTime ? (
            <p className="payment-popup__success">
              {t("exitWithin", { exitTimeLimit: formattedExitTime })}
            </p>
          ) : null}

          {error ? <p className="payment-popup__error">{error}</p> : null}

          <button
            type="button"
            className="payment-popup__close-btn"
            onClick={() => void startPaymentSession()}
            disabled={
              isBusy ||
              !canCreatePayment ||
              timeLeft <= 0 ||
              !transaction ||
              amountSatang <= 0 ||
              amount <= MIN_PROMPTPAY_AMOUNT_BAHT
            }
          >
            <BsQrCodeScan />
            <span>{paymentButtonText}</span>
          </button>

          <button
            type="button"
            className="payment-popup__close-btn"
            onClick={onClose}
            disabled={step === "creating"}
          >
            <FiXCircle />
            <span>{t("cancel")}</span>
          </button>
        </div>
      </div>

      <PlateCandidatePopup
        open={candidates.length > 0}
        candidates={candidates}
        onClose={() => setCandidates([])}
        onSelect={(plateNo) => {
          setCandidates([]);
          const targetParams = new URLSearchParams({ plateNo });

          if (paymentDeviceType === "barrier-gate" && paymentDeviceId) {
            targetParams.set("deviceId", paymentDeviceId);
          }

          window.location.replace(
            paymentDeviceType === "barrier-gate"
              ? `/landing/check-payment?${targetParams.toString()}`
              : `/landing/detail?${targetParams.toString()}`
          );
        }}
      />
    </>
  );
}

export default function PaymentPopup(props: PaymentPopupProps) {
  if (!props.open || !props.transaction) return null;

  return <PaymentPopupContent {...props} />;
}
