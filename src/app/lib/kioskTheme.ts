// Types
import type { PublicDeviceConfigResponse } from "@/src/app/type/client";

// Type สำหรับ Theme ของ Kiosk
export type KioskThemeConfig = PublicDeviceConfigResponse["theme"];
// Type สำหรับ Response ของการดึงข้อมูล Theme ของ Kiosk
export type KioskConfigResponse = PublicDeviceConfigResponse;

// Key สำหรับเก็บค่า KioskThemeConfig ใน localStorage
export const KIOSK_THEME_STORAGE_KEY = "kioskThemeConfig";
// ค่า Default ของ Theme Color ของ Kiosk
const DEFAULT_THEME_COLOR = "#FFD54F";

// Function แปลงค่าเป็น string หากไม่ได้คืนค่า null
function toNullableString(value: unknown) {
    return typeof value === "string" ? value : null;
}

// Function สำหรับดึงค่า Theme Color ของ Kiosk จาก KioskThemeConfig ถ้าไม่มีค่าที่ถูกต้องจะคืนค่า DEFAULT_THEME_COLOR
export function resolveThemeColor(theme: KioskThemeConfig) {
    const sourceColor =
        theme.themeMode === "custom"
            ? theme.customThemeColor
            : theme.themeColor;
    const color = sourceColor?.trim();

    return color && /^#[0-9A-F]{6}$/i.test(color)
        ? color
        : DEFAULT_THEME_COLOR;
}

// Function สำหรับตรวจสอบและแปลงค่า KioskThemeConfig ให้เป็นค่า KioskThemeConfig ที่ถูกต้อง ถ้าไม่ถูกต้องจะคืนค่า null
export function normalizeKioskTheme(value: unknown): KioskThemeConfig | null {
    if (!value || typeof value !== "object") return null;
    const data = value as Partial<KioskThemeConfig>;

    return {
        systemName: toNullableString(data.systemName),
        themeColor: toNullableString(data.themeColor),
        customThemeColor: toNullableString(data.customThemeColor),
        logoUrl: toNullableString(data.logoUrl),
        themeMode: data.themeMode === "custom" ? "custom" : "theme",
        updatedAt: toNullableString(data.updatedAt),
    };
}

// Function สำหรับนำค่า KioskThemeConfig ไปใช้กับ root element ของ document
export function applyKioskThemeToRoot(theme: KioskThemeConfig) {
    if (typeof document === "undefined") return;
    const color = resolveThemeColor(theme);

    document.documentElement.style.setProperty("--theme", color);
    document.documentElement.style.setProperty("--keyboard-confirm", color);
}

// Function สำหรับบันทึกค่า KioskThemeConfig ลงใน localStorage
export function saveKioskThemeToStorage(theme: KioskThemeConfig) {
    if (typeof window === "undefined") return;
    localStorage.setItem(KIOSK_THEME_STORAGE_KEY, JSON.stringify(theme));
}

// Function สำหรับดึงค่า KioskThemeConfig จาก localStorage ถ้าไม่มีค่าที่ถูกต้องจะคืนค่า null
export function getKioskThemeFromStorage() {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(KIOSK_THEME_STORAGE_KEY);
        return raw ? normalizeKioskTheme(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}
