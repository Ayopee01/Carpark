export const MIN_PLATE_NO_LENGTH = 4;

export function normalizePlateNo(value: string) {
    return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function isValidPlateNo(value: string) {
    return normalizePlateNo(value).length >= MIN_PLATE_NO_LENGTH;
}

export function getPlateNoValidationMessage() {
    return `plateNo must be at least ${MIN_PLATE_NO_LENGTH} characters`;
}
