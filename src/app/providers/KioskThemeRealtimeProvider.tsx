"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    applyKioskThemeToRoot,
    getKioskThemeFromStorage,
    normalizeKioskTheme,
    saveKioskThemeToStorage,
    type KioskConfigResponse,
    type KioskThemeConfig,
} from "@/src/app/lib/kioskTheme";

type KioskThemeContextValue = {
    theme: KioskThemeConfig | null;
    systemName: string | null;
    status: string | null;
    loading: boolean;
    refreshTheme: () => Promise<void>;
};

const KIOSK_META_STORAGE_KEY = "kioskConfigMeta";
const KIOSK_CONFIG_UPDATED_EVENT = "kiosk-config-updated";

const KioskThemeContext = createContext<KioskThemeContextValue>({
    theme: null,
    systemName: null,
    status: null,
    loading: true,
    refreshTheme: async () => { },
});

export function useKioskTheme() {
    return useContext(KioskThemeContext);
}

function getEventPayload(event: MessageEvent) {
    try {
        return JSON.parse(event.data) as unknown;
    } catch {
        return null;
    }
}

function saveKioskMetaToStorage(data: {
    systemName: string | null;
    status: string | null;
}) {
    if (typeof window === "undefined") return;

    localStorage.setItem(KIOSK_META_STORAGE_KEY, JSON.stringify(data));
}

function getKioskMetaFromStorage() {
    if (typeof window === "undefined") {
        return {
            systemName: null,
            status: null,
        };
    }

    try {
        const raw = localStorage.getItem(KIOSK_META_STORAGE_KEY);

        if (!raw) {
            return {
                systemName: null,
                status: null,
            };
        }

        const parsed = JSON.parse(raw) as {
            systemName?: unknown;
            status?: unknown;
        };

        return {
            systemName:
                typeof parsed.systemName === "string" ? parsed.systemName : null,
            status: typeof parsed.status === "string" ? parsed.status : null,
        };
    } catch {
        return {
            systemName: null,
            status: null,
        };
    }
}

export function KioskThemeRealtimeProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [theme, setTheme] = useState<KioskThemeConfig | null>(null);
    const [systemName, setSystemName] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const hasLoggedSseErrorRef = useRef(false);

    const commitTheme = useCallback((nextTheme: KioskThemeConfig) => {
        applyKioskThemeToRoot(nextTheme);
        saveKioskThemeToStorage(nextTheme);
        setTheme(nextTheme);
    }, []);

    const commitMeta = useCallback(
        (data: { systemName?: unknown; status?: unknown }) => {
            const nextSystemName =
                typeof data.systemName === "string" ? data.systemName : null;

            const nextStatus = typeof data.status === "string" ? data.status : null;

            setSystemName(nextSystemName);
            setStatus(nextStatus);

            saveKioskMetaToStorage({
                systemName: nextSystemName,
                status: nextStatus,
            });
        },
        []
    );

    const commitConfig = useCallback(
        (config: KioskConfigResponse) => {
            const nextTheme = normalizeKioskTheme(config.theme);

            if (!nextTheme) {
                throw new Error("ข้อมูล theme จาก API ไม่ถูกต้อง");
            }

            commitTheme(nextTheme);
            commitMeta({
                systemName: config.systemName,
                status: config.status,
            });
        },
        [commitTheme, commitMeta]
    );

    const refreshTheme = useCallback(async () => {
        try {
            const response = await fetch("/api/kiosk/config", {
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

    useEffect(() => {
        const cachedTheme = getKioskThemeFromStorage();
        const cachedMeta = getKioskMetaFromStorage();

        if (cachedTheme) {
            commitTheme(cachedTheme);
            setLoading(false);
        }

        if (cachedMeta.systemName || cachedMeta.status) {
            setSystemName(cachedMeta.systemName);
            setStatus(cachedMeta.status);
        }

        refreshTheme();
    }, [commitTheme, refreshTheme]);

    useEffect(() => {
        const handleKioskConfigUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<KioskConfigResponse>;
            const config = customEvent.detail;

            if (!config?.theme) return;

            try {
                commitConfig(config);
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

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key !== "kioskThemeConfig" && event.key !== KIOSK_META_STORAGE_KEY) {
                return;
            }

            const cachedTheme = getKioskThemeFromStorage();
            const cachedMeta = getKioskMetaFromStorage();

            if (cachedTheme) {
                commitTheme(cachedTheme);
            }

            setSystemName(cachedMeta.systemName);
            setStatus(cachedMeta.status);
            setLoading(false);
        };

        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, [commitTheme]);

    useEffect(() => {
        let eventSource: EventSource | null = null;

        try {
            eventSource = new EventSource("/api/kiosk/events");

            const handleThemeUpdated = () => {
                refreshTheme();
            };

            const handleMessage = (event: MessageEvent) => {
                const payload = getEventPayload(event);

                if (!payload || typeof payload !== "object") {
                    return;
                }

                const data = payload as {
                    type?: string;
                    theme?: unknown;
                    systemName?: unknown;
                    status?: unknown;
                };

                if (data.theme) {
                    const nextTheme = normalizeKioskTheme(data.theme);

                    if (nextTheme) {
                        commitTheme(nextTheme);

                        if (
                            typeof data.systemName === "string" ||
                            typeof data.status === "string"
                        ) {
                            commitMeta({
                                systemName: data.systemName,
                                status: data.status,
                            });
                        }

                        setLoading(false);
                        return;
                    }
                }

                if (data.type === "theme_updated") {
                    refreshTheme();
                }
            };

            eventSource.addEventListener("theme_updated", handleThemeUpdated);
            eventSource.onmessage = handleMessage;

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
    }, [commitTheme, commitMeta, refreshTheme]);

    const value = useMemo(
        () => ({
            theme,
            systemName,
            status,
            loading,
            refreshTheme,
        }),
        [theme, systemName, status, loading, refreshTheme]
    );

    return (
        <KioskThemeContext.Provider value={value}>
            {children}
        </KioskThemeContext.Provider>
    );
}