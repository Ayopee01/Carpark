import type { ClientTransactionResponse } from "@/src/app/type/client";
import { PLATE_RESULT_STORAGE_KEYS } from "@/src/app/lib/storageKeys";

// Function สำหรับบันทึกผลการค้นหา Transaction ลง sessionStorage เพื่อให้หน้า Detail ใช้ต่อ
export function savePlateTransactionResult(
    plateNo: string,
    transaction: ClientTransactionResponse
) {
    sessionStorage.setItem(PLATE_RESULT_STORAGE_KEYS.searchedPlate, plateNo);
    sessionStorage.setItem(
        PLATE_RESULT_STORAGE_KEYS.plateDetailData,
        JSON.stringify(transaction)
    );
    sessionStorage.setItem(
        PLATE_RESULT_STORAGE_KEYS.plateSearchResponse,
        JSON.stringify(transaction)
    );
}
