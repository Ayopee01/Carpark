import type {
  ClientPaymentResponse,
  ClientTransactionResponse,
  DeviceType,
  OmisePaymentUpdatedEvent,
} from "@/src/app/type/client";

export type OmisePaymentUpdatePayload = Partial<OmisePaymentUpdatedEvent> & {
  action?: string;
  status?: string;
  data?: Partial<OmisePaymentUpdatedEvent> & {
    status?: string;
  };
  gatewayCharge?: {
    chargeId?: string | null;
    plateNo?: string | null;
    status?: string | null;
  };
};

export function buildPaymentWebSocketUrl(baseUrl: string, chargeId: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("chargeId", chargeId);
  return url.toString();
}

export function buildSuccessfulPayment(
  transaction: ClientTransactionResponse,
  event: OmisePaymentUpdatedEvent,
  clientType: DeviceType | "mobile"
): ClientPaymentResponse {
  const paidAmount = transaction.amount.netAmount - event.remainingAmount;

  return {
    message: "Payment successful",
    clientType,
    device: transaction.device,
    transaction: {
      ...transaction,
      status: event.transactionStatus || "paid_waiting_exit",
      exitTimeLimit: event.exitTimeLimit,
      amount: {
        ...transaction.amount,
        paidAmount,
        remainingAmount: event.remainingAmount,
      },
    },
  };
}

export function buildSuccessfulPaymentFromTransaction(
  transaction: ClientTransactionResponse,
  clientType: DeviceType | "mobile"
): ClientPaymentResponse {
  return {
    message: "Payment successful",
    clientType,
    device: transaction.device,
    transaction,
  };
}

export function isTransactionPaid(transaction: ClientTransactionResponse) {
  return (
    transaction.amount.remainingAmount <= 0 ||
    transaction.status === "paid_waiting_exit" ||
    transaction.status === "completed"
  );
}

export function normalizePaymentUpdatedEvent(
  payload: OmisePaymentUpdatePayload,
  chargeId: string,
  transaction: ClientTransactionResponse
): OmisePaymentUpdatedEvent | null {
  const payloadChargeId =
    payload.chargeId ?? payload.data?.chargeId ?? payload.gatewayCharge?.chargeId;
  const paymentStatus =
    payload.paymentStatus ??
    payload.data?.paymentStatus ??
    payload.status ??
    payload.data?.status ??
    payload.gatewayCharge?.status;

  if (!payloadChargeId || payloadChargeId !== chargeId || !paymentStatus) {
    return null;
  }

  if (
    paymentStatus !== "successful" &&
    paymentStatus !== "failed" &&
    paymentStatus !== "expired"
  ) {
    return null;
  }

  const isSuccessful = paymentStatus === "successful";
  const remainingAmount =
    payload.remainingAmount ??
    payload.data?.remainingAmount ??
    (isSuccessful ? 0 : transaction.amount.remainingAmount);

  return {
    type: "payment_updated",
    provider: payload.provider ?? "omise",
    chargeId: payloadChargeId,
    plateNo:
      payload.plateNo ??
      payload.data?.plateNo ??
      payload.gatewayCharge?.plateNo ??
      transaction.plateNo,
    paymentStatus,
    transactionStatus:
      payload.transactionStatus ??
      payload.data?.transactionStatus ??
      (isSuccessful ? "paid_waiting_exit" : transaction.status),
    remainingAmount,
    exitTimeLimit: payload.exitTimeLimit ?? payload.data?.exitTimeLimit ?? null,
  };
}
