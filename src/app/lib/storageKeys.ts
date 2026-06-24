// Key สำหรับเก็บข้อมูลการค้นหาและ Flow ที่ต้องใช้ร่วมกันหลายหน้า
export const PLATE_RESULT_STORAGE_KEYS = {
    searchedPlate: "searchedPlate",
    plateDetailData: "plateDetailData",
    plateSearchResponse: "plateSearchResponse",
} as const;

// Key สำหรับจำ URL กลับไปหน้า Barrier Gate หลังจ่ายเงิน
export const BARRIER_RETURN_STORAGE_KEY = "barrierGateReturnUrl";

// ชื่อ Event สำหรับแจ้งให้ Provider อัปเดต Config หลัง Activate สำเร็จ
export const KIOSK_CONFIG_UPDATED_EVENT = "kiosk-config-updated";
