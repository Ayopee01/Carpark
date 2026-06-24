import type {
    ClientTransactionCandidate,
    ClientTransactionMultipleResponse,
} from "@/src/app/type/client";

// Function สำหรับตรวจสอบกรณี Backend แจ้งว่ารายการถูกดำเนินการแล้ว
export function isAlreadyProcessedTransactionError(
    status: number,
    data?: { message?: string; status?: string } | null
) {
    if (status !== 403) return false;

    const message = data?.message?.toLowerCase() ?? "";
    const transactionStatus = data?.status?.toLowerCase() ?? "";

    return (
        message.includes("already processed") ||
        transactionStatus === "completed"
    );
}

// Function สำหรับตรวจสอบว่า Response เป็นรายการทะเบียนหลายรายการที่ต้องให้ผู้ใช้เลือก
export function isMultipleTransactionResponse(
    value: unknown
): value is ClientTransactionMultipleResponse {
    if (!value || typeof value !== "object") return false;

    const data = value as Partial<ClientTransactionMultipleResponse>;

    return (
        data.matchType === "multiple" &&
        data.requiresSelection === true &&
        Array.isArray(data.candidates)
    );
}

// Function สำหรับกรองเฉพาะรายการที่ยังควรให้เลือกเพื่อไปค้นหาต่อ
export function isSelectableTransactionCandidate(
    candidate: ClientTransactionCandidate
) {
    const status = candidate.status.toLowerCase();

    return (
        !candidate.exitAt &&
        status !== "completed" &&
        status !== "cancelled" &&
        status !== "paid_waiting_exit"
    );
}
