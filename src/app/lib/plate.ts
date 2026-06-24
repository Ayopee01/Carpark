// Config Validation input ของ plate
export const MIN_PLATE_NO_LENGTH = 4;

// Function Replace "ช่องว่าง" ออก กรณีมีการกรอก "ช่องว่าง" มา
export function normalizePlateNo(value: string) {
    return value.trim().replace(/\s+/g, "").toUpperCase();
}

// Function ตรวจสอบ Validation ให้ครบตาม Config
export function isValidPlateNo(value: string) {
    return normalizePlateNo(value).length >= MIN_PLATE_NO_LENGTH;
}
