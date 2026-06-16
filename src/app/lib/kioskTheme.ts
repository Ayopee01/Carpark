import type { PublicDeviceConfigResponse } from "@/src/app/type/client";

export type KioskThemeConfig = PublicDeviceConfigResponse["theme"];
export type KioskConfigResponse = PublicDeviceConfigResponse;

export const KIOSK_THEME_STORAGE_KEY = "kioskThemeConfig";
export const DEFAULT_THEME_COLOR = "#FFD54F";

export function isHexColor(value: string) {
    return /^#[0-9A-F]{6}$/i.test(value);
}

function normalizeHexColor(value: string | null | undefined) {
    if (!value) return null;
    const color = value.trim();
    return isHexColor(color) ? color : null;
}

export function resolveThemeColor(theme: KioskThemeConfig) {
    const sourceColor =
        theme.themeMode === "custom"
            ? theme.customThemeColor
            : theme.themeMode === "theme"
                ? theme.themeColor
                : null;

    return normalizeHexColor(sourceColor) ?? DEFAULT_THEME_COLOR;
}

export function normalizeKioskTheme(value: unknown): KioskThemeConfig | null {
    if (!value || typeof value !== "object") return null;
    const data = value as Partial<KioskThemeConfig>;
    const themeMode = data.themeMode === "custom" ? "custom" : "theme";

    return {
        systemName: typeof data.systemName === "string" ? data.systemName : null,
        themeColor: typeof data.themeColor === "string" ? data.themeColor : null,
        customThemeColor:
            typeof data.customThemeColor === "string" ? data.customThemeColor : null,
        logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
        themeMode,
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    };
}

export function applyKioskThemeToRoot(theme: KioskThemeConfig) {
    if (typeof document === "undefined") return;
    const color = resolveThemeColor(theme);

    document.documentElement.style.setProperty("--theme", color);
    document.documentElement.style.setProperty("--keyboard-confirm", color);
}

export function saveKioskThemeToStorage(theme: KioskThemeConfig) {
    if (typeof window === "undefined") return;
    localStorage.setItem(KIOSK_THEME_STORAGE_KEY, JSON.stringify(theme));
}

export function getKioskThemeFromStorage() {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(KIOSK_THEME_STORAGE_KEY);
        return raw ? normalizeKioskTheme(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}
