"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import PaymentPopup from "@/src/app/components/PaymentPopup";
import {
    getDeviceAuthHeaders,
    getStoredDeviceCredential,
    handleDeviceResponseStatus,
} from "@/src/app/lib/device";
import { barrierHardwareAdapter } from "@/src/app/lib/hardwareAdapter";
import { normalizePlateNo } from "@/src/app/lib/plate";
import { BARRIER_RETURN_STORAGE_KEY } from "@/src/app/lib/storageKeys";
import type { ClientTransactionResponse } from "@/src/app/type/client";

import "@/src/app/css/BarrierGate.css";

import { LuCheck, LuLoader, LuX } from "react-icons/lu";

type PageState = "loading" | "ready" | "paying" | "open" | "error";

export default function BarrierCheckPaymentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations("BarrierGate");
    const common = useTranslations("Common");
    const plateNo = normalizePlateNo(searchParams.get("plateNo") ?? "");
    const transactionId = searchParams.get("transactionId")?.trim() ?? "";
    const queryDeviceId = searchParams.get("deviceId")?.trim() ?? "";
    const [transaction, setTransaction] =
        useState<ClientTransactionResponse | null>(null);
    const [state, setState] = useState<PageState>("loading");
    const [message, setMessage] = useState("");
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    const credential = getStoredDeviceCredential();
    const barrierDeviceId =
        queryDeviceId || (credential?.deviceType === "barrier_gate"
            ? credential.deviceId
            : "");
    const remainingAmount = transaction?.amount?.remainingAmount ?? 0;

    const returnToBarrier = useCallback(() => {
        const returnUrl = sessionStorage.getItem(BARRIER_RETURN_STORAGE_KEY);
        if (returnUrl?.startsWith("/landing/barrier-gate")) {
            sessionStorage.removeItem(BARRIER_RETURN_STORAGE_KEY);
            router.replace(returnUrl);
            return;
        }

        router.replace("/landing/barrier-gate");
    }, [router]);

    useEffect(() => {
        let cancelled = false;

        const loadTransaction = async () => {
            if (!plateNo) {
                setState("error");
                setMessage(t("errorNotFound"));
                return;
            }

            try {
                setState("loading");
                setMessage("");

                const query = new URLSearchParams({ plateNo });
                if (barrierDeviceId) {
                    query.set("deviceId", barrierDeviceId);
                }

                const response = await fetch(
                    `/api/client/transaction?${query.toString()}`,
                    {
                        method: "GET",
                        headers: barrierDeviceId
                            ? getDeviceAuthHeaders("barrier-gate")
                            : {},
                        cache: "no-store",
                    }
                );
                const result = (await response.json().catch(() => null)) as
                    | ClientTransactionResponse
                    | { message?: string; status?: string }
                    | null;

                if (
                    handleDeviceResponseStatus(
                        response,
                        result as { message?: string; status?: string } | null
                    )
                ) {
                    return;
                }

                if (cancelled) return;

                if (!response.ok || !result || !("transactionId" in result)) {
                    setState("error");
                    setMessage(t(response.status === 404 ? "errorNotFound" : "errorCheckFailed"));
                    return;
                }

                setTransaction(result);
                setState("ready");
                setMessage(t("actionPaymentRequired"));
            } catch {
                if (cancelled) return;
                setState("error");
                setMessage(t("errorCheckFailed"));
            }
        };

        void loadTransaction();

        return () => {
            cancelled = true;
        };
    }, [barrierDeviceId, plateNo, t]);

    const handlePaymentSuccess = async () => {
        setIsPaymentOpen(false);
        setState("paying");
        setMessage(t("paymentSuccessOpeningGate"));

        try {
            await barrierHardwareAdapter.openGate();
            setState("open");
            setMessage(t("opened"));
            window.setTimeout(returnToBarrier, 2500);
        } catch (error) {
            console.error("Barrier hardware open failed after payment:", error);
            setState("error");
            setMessage(t("offline"));
        }
    };

    return (
        <main className="barrier-gate-page">
            <section className="barrier-gate-page__content">
                <header className="barrier-gate-header">
                    <div className="barrier-gate-header__icon">
                        {state === "loading" || state === "paying" ? (
                            <LuLoader className="barrier-gate-spin" />
                        ) : state === "open" ? (
                            <LuCheck />
                        ) : state === "error" ? (
                            <LuX />
                        ) : (
                            <LuX />
                        )}
                    </div>
                    <h1>{t("checkPaymentTitle")}</h1>
                    <p>{t("checkPaymentSubtitle")}</p>
                </header>

                <section className="barrier-gate-capture" aria-live="polite">
                    <span className="barrier-gate-capture__label">
                        {transactionId ? t("transactionId") : t("inputLabel")}
                    </span>
                    <strong>{plateNo || transactionId || "-"}</strong>
                    <p>{message || common("pleaseWait")}</p>
                </section>

                {transaction ? (
                    <section className="barrier-gate-payment">
                        <div>
                            <span>{t("remaining")}</span>
                            <h2>
                                {remainingAmount.toLocaleString("th-TH")} {common("baht")}
                            </h2>
                            <p>{t("paymentRequiredDescription")}</p>
                        </div>

                        <div className="barrier-gate-payment__amount">
                            <span>{t("eventStatus")}</span>
                            <strong>{transaction.status}</strong>
                        </div>

                        <button
                            type="button"
                            className="barrier-gate-payment__button"
                            onClick={() => setIsPaymentOpen(true)}
                            disabled={state !== "ready" || remainingAmount <= 0}
                        >
                            {t("payNow")}
                        </button>
                    </section>
                ) : null}

                {state === "error" ? (
                    <button
                        type="button"
                        className="barrier-gate-reset"
                        onClick={returnToBarrier}
                    >
                        {t("reset")}
                    </button>
                ) : null}
            </section>

            <PaymentPopup
                open={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                transaction={transaction}
                paymentDeviceId={barrierDeviceId}
                paymentDeviceType="barrier-gate"
                onSuccess={handlePaymentSuccess}
            />
        </main>
    );
}
