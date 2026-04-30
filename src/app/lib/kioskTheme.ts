export type KioskThemePreset = {
    themeColor: string;
};

export type KioskThemeConfig = {
    themeColor: string;
    logoUrl: string | null;
    themeName?: string;
    updatedAt?: string;
    method?: string;
    action?: string;
    presets?: {
        preset1?: KioskThemePreset;
        preset2?: KioskThemePreset;
        preset3?: KioskThemePreset;
        preset4?: KioskThemePreset;
    };
};

export type KioskConfigResponse = {
    theme: KioskThemeConfig;
    systemName: string;
    status: string;
};

export const KIOSK_THEME_STORAGE_KEY = "kioskThemeConfig";

export function isHexColor(value: string) {
    return /^#[0-9A-F]{6}$/i.test(value);
}

export function normalizeKioskTheme(value: unknown): KioskThemeConfig | null {
    if (!value || typeof value !== "object") return null;

    const data = value as Partial<KioskThemeConfig>;

    /**
     * ใช้ themeColor จาก API เท่านั้น
     * ถ้าไม่มี themeColor หรือ themeColor ไม่ใช่ HEX ที่ถูกต้อง
     * จะ return null เพื่อให้ระบบใช้ค่า default จาก globals.css ต่อไป
     */
    if (
        typeof data.themeColor !== "string" ||
        !isHexColor(data.themeColor)
    ) {
        return null;
    }

    return {
        themeColor: data.themeColor,
        logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
        themeName: data.themeName,
        updatedAt: data.updatedAt,
        method: data.method,
        action: data.action,
        presets: data.presets,
    };
}

export function applyKioskThemeToRoot(theme: KioskThemeConfig) {
    if (typeof document === "undefined") return;

    /**
     * ใช้ theme.themeColor ไป override :root ของ globals.css
     * เช่น API ส่ง #2e7d32 จะได้:
     * --theme: #2e7d32;
     * --keyboard-confirm: #2e7d32;
     */
    if (!theme.themeColor || !isHexColor(theme.themeColor)) return;

    const root = document.documentElement;

    root.style.setProperty("--theme", theme.themeColor);
    root.style.setProperty("--keyboard-confirm", theme.themeColor);
}

export function saveKioskThemeToStorage(theme: KioskThemeConfig) {
    if (typeof window === "undefined") return;

    localStorage.setItem(KIOSK_THEME_STORAGE_KEY, JSON.stringify(theme));
}

export function getKioskThemeFromStorage() {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(KIOSK_THEME_STORAGE_KEY);
        if (!raw) return null;

        return normalizeKioskTheme(JSON.parse(raw));
    } catch {
        return null;
    }
}