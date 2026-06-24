"use client";

// Import Libraries
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
type ReactNode } from "react";
// Lib
import { applyKioskThemeToRoot, getKioskThemeFromStorage, KIOSK_THEME_STORAGE_KEY, normalizeKioskTheme, saveKioskThemeToStorage } from "@/src/app/lib/kioskTheme";
import { getDeviceId, getDeviceToken, getStoredDeviceCredential } from "@/src/app/lib/device";
import { KIOSK_CONFIG_UPDATED_EVENT } from "@/src/app/lib/storageKeys";
// Types
import type { KioskConfigResponse, KioskThemeConfig } from "@/src/app/lib/kioskTheme";

// ------------------------------- Types -------------------------------

// ข้อมูล Theme และสถานะที่ Component ภายใน Provider สามารถเรียกใช้ได้
type KioskThemeContextValue = {
    theme: KioskThemeConfig | null;
    systemName: string | null;
    status: string | null;
    loading: boolean;
    refreshTheme: () => Promise<void>;
};

// ------------------------------- Config -------------------------------

// Key สำหรับเก็บข้อมูลประกอบ และชื่อ CustomEvent สำหรับอัปเดต Config ภายใน Browser
const KIOSK_META_STORAGE_KEY = "kioskConfigMeta";

// ------------------------------- Context -------------------------------

// ค่าเริ่มต้นก่อนโหลด Theme จาก Storage หรือ API
const KioskThemeContext = createContext<KioskThemeContextValue>({
    theme: null,
    systemName: null,
    status: null,
    loading: true,
    refreshTheme: async () => { },
});

// Hook สำหรับเรียกใช้ Theme และสถานะ Kiosk จาก Context
export function useKioskTheme() {
    return useContext(KioskThemeContext);
}

// ------------------------------- Helpers -------------------------------

// แปลง JSON จาก SSE และคืนค่า null เมื่อ payload ไม่ถูกต้อง
function getEventPayload(event: MessageEvent) {
    try {
        return JSON.parse(event.data) as unknown;
    } catch {
        return null;
    }
}

// บันทึกชื่อระบบและสถานะอุปกรณ์ลง localStorage
function saveKioskMetaToStorage(data: {
    status: string | null;
}) {
    if (typeof window === "undefined") return;

    localStorage.setItem(KIOSK_META_STORAGE_KEY, JSON.stringify(data));
}

// อ่านชื่อระบบและสถานะอุปกรณ์จาก localStorage
function getKioskMetaFromStorage() {
    if (typeof window === "undefined") {
        return {
            status: null,
        };
    }

    try {
        const raw = localStorage.getItem(KIOSK_META_STORAGE_KEY);

        if (!raw) {
            return {
                status: null,
            };
        }

        const parsed = JSON.parse(raw) as {
            status?: unknown;
        };

        return {
            status: typeof parsed.status === "string" ? parsed.status : null,
        };
    } catch {
        return {
            status: null,
        };
    }
}

// ------------------------------- Function -------------------------------

// จัดการ Theme จาก Storage, API และ SSE แล้วส่งต่อผ่าน Context
export function KioskThemeRealtimeProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [theme, setTheme] = useState<KioskThemeConfig | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sseVersion, setSseVersion] = useState(0);

    // ป้องกันการแสดงข้อความ SSE error ซ้ำระหว่าง EventSource reconnect
    const hasLoggedSseErrorRef = useRef(false);

    // ใช้ Theme กับ CSS variables บันทึกลง Storage และอัปเดต State
    const commitTheme = useCallback((nextTheme: KioskThemeConfig) => {
        applyKioskThemeToRoot(nextTheme);
        saveKioskThemeToStorage(nextTheme);
        setTheme(nextTheme);
    }, []);

    // อัปเดตชื่อระบบและสถานะอุปกรณ์ทั้งใน State และ localStorage
    const commitMeta = useCallback(
        (data: { status?: unknown }) => {
            const nextStatus = typeof data.status === "string" ? data.status : null;

            setStatus(nextStatus);

            saveKioskMetaToStorage({
                status: nextStatus,
            });
        },
        []
    );

    // ตรวจ Config แล้วอัปเดต Theme และข้อมูลประกอบพร้อมกัน
    const commitConfig = useCallback(
        (config: KioskConfigResponse) => {
            const nextTheme = normalizeKioskTheme(config.theme);

            if (!nextTheme) {
                throw new Error("ข้อมูล theme จาก API ไม่ถูกต้อง");
            }

            commitTheme(nextTheme);
            commitMeta({
                status: getStoredDeviceCredential()?.status,
            });
        },
        [commitTheme, commitMeta]
    );

    // โหลด Config ล่าสุดจาก Next.js API
    const refreshTheme = useCallback(async () => {
        try {
            const response = await fetch("/api/devices/config", {
                method: "GET",
                cache: "no-store",
            });

            const result: KioskConfigResponse | null = await response
                .json()
                .catch(() => null);

            if (!response.ok || !result?.theme) {
                throw new Error("โหลดข้อมูล Kiosk config ไม่สำเร็จ");
            }

            commitConfig(result);
        } catch (err) {
            console.warn("โหลด theme ไม่สำเร็จ:", err);
        } finally {
            setLoading(false);
        }
    }, [commitConfig]);

    // ------------------------------- useEffect -------------------------------

    // ใช้ Theme ที่เก็บไว้เพื่อแสดงผลก่อน แล้วโหลด Config ล่าสุดจาก API
    useEffect(() => {
        const cachedTheme = getKioskThemeFromStorage();
        const cachedMeta = getKioskMetaFromStorage();

        if (cachedTheme) {
            commitTheme(cachedTheme);
            setLoading(false);
        }

        if (cachedMeta.status) {
            setStatus(cachedMeta.status);
        }

        refreshTheme();
    }, [commitTheme, refreshTheme]);

    // รับ Config ที่หน้า Activate ส่งมาหลังเปิดใช้งานอุปกรณ์สำเร็จ
    useEffect(() => {
        const handleKioskConfigUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<KioskConfigResponse>;
            const config = customEvent.detail;

            if (!config?.theme) return;

            try {
                commitConfig(config);
                setSseVersion((version) => version + 1);
                setLoading(false);
            } catch (err) {
                console.warn("อัปเดต theme จาก Activate ไม่สำเร็จ:", err);
            }
        };

        window.addEventListener(KIOSK_CONFIG_UPDATED_EVENT, handleKioskConfigUpdated);

        return () => {
            window.removeEventListener(
                KIOSK_CONFIG_UPDATED_EVENT,
                handleKioskConfigUpdated
            );
        };
    }, [commitConfig]);

    // ซิงก์ Theme เมื่อ localStorage ถูกเปลี่ยนจาก Browser tab อื่น
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key !== KIOSK_THEME_STORAGE_KEY && event.key !== KIOSK_META_STORAGE_KEY) {
                return;
            }

            const cachedTheme = getKioskThemeFromStorage();
            const cachedMeta = getKioskMetaFromStorage();

            if (cachedTheme) {
                commitTheme(cachedTheme);
            }

            setStatus(cachedMeta.status);
            setLoading(false);
        };

        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, [commitTheme]);

    // เชื่อมต่อ SSE เพื่อรับ ping, theme_updated และ Theme payload แบบ Realtime
    useEffect(() => {
        let eventSource: EventSource | null = null;

        try {
            const deviceId = getDeviceId();
            const deviceToken = getDeviceToken();
            const eventUrl = deviceId
                ? `/api/client/events?${new URLSearchParams({
                    deviceId,
                    ...(deviceToken ? { deviceToken } : {}),
                }).toString()}`
                : "/api/client/events";

            eventSource = new EventSource(eventUrl);

            // แปลงและจัดการ payload ตามประเภทข้อมูลที่ Backend ส่งมา
            const handleThemePayload = (event: MessageEvent) => {
                const payload = getEventPayload(event);

                if (!payload || typeof payload !== "object") {
                    return false;
                }

                    const data = payload as {
                    type?: string;
                    theme?: unknown;
                    systemName?: unknown;
                    status?: unknown;
                };

                // ping ใช้ยืนยันว่า SSE connection ยังส่งข้อมูลได้
                if (data.type === "ping") {
                    return true;
                }

                // โหลด Config ใหม่เพื่อรับ logoUrl และ updatedAt หลัง Backend บันทึกสำเร็จ
                if (data.type === "theme_updated") {
                    void refreshTheme();
                    return true;
                }

                // รองรับกรณี SSE ส่ง Theme object มากับ payload โดยตรง
                if (data.theme) {
                    const nextTheme = normalizeKioskTheme(data.theme);

                    if (nextTheme) {
                        commitTheme(nextTheme);

                        if (typeof data.status === "string") {
                            commitMeta({
                                status: data.status,
                            });
                        }

                        setLoading(false);
                        return true;
                    }
                }

                return false;
            };

            // Handler สำหรับ named event: theme_updated
            const handleThemeUpdated = (event: Event) => {
                const wasHandled = handleThemePayload(event as MessageEvent);

                if (!wasHandled) {
                    void refreshTheme();
                }
            };

            eventSource.addEventListener("theme_updated", handleThemeUpdated);
            eventSource.onmessage = handleThemePayload;

            // Reset สถานะการแจ้ง error เมื่อเชื่อมต่อ SSE สำเร็จ
            eventSource.onopen = () => {
                hasLoggedSseErrorRef.current = false;
                console.info("SSE theme connected");
            };

            eventSource.onerror = () => {
                if (!hasLoggedSseErrorRef.current) {
                    console.warn(
                        "SSE theme disconnected or unavailable. EventSource will retry automatically."
                    );

                    hasLoggedSseErrorRef.current = true;
                }
            };

            // ยกเลิก Event listener และปิด Connection เมื่อ Effect ถูก cleanup
            return () => {
                eventSource?.removeEventListener(
                    "theme_updated",
                    handleThemeUpdated
                );
                eventSource?.close();
            };
        } catch (err) {
            console.warn("SSE theme cannot start:", err);
        }

        return () => {
            eventSource?.close();
        };
    }, [commitTheme, commitMeta, refreshTheme, sseVersion]);

    // โหลด Config สำรองทุก 60 วินาทีเมื่อ SSE event ไม่มาถึง
    useEffect(() => {
        const pollingTimer = window.setInterval(() => {
            void refreshTheme();
        }, 60000);

        return () => window.clearInterval(pollingTimer);
    }, [refreshTheme]);

    // จดจำ Context value และสร้างใหม่เมื่อข้อมูลที่เกี่ยวข้องเปลี่ยน
    const value = useMemo(
        () => ({
            theme,
            systemName: theme?.systemName ?? null,
            status,
            loading,
            refreshTheme,
        }),
        [theme, status, loading, refreshTheme]
    );

    // ----------------------------------- UI -----------------------------------
    return (
        <KioskThemeContext.Provider value={value}>
            {children}
        </KioskThemeContext.Provider>
    );
}
