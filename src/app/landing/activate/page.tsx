"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    LuCheck,
    LuDelete,
    LuLoader,
    LuMonitor,
    LuX,
} from "react-icons/lu";
// Lib
import {
    applyKioskThemeToRoot,
    normalizeKioskTheme,
    saveKioskThemeToStorage,
    type KioskConfigResponse,
} from "@/src/app/lib/kioskTheme";
// CSS
import "@/src/app/css/KioskActivate.css";

type KioskActivateResponse = {
    success: boolean;
    message: string;
    deviceId?: string;
    kiosk?: {
        deviceId: string;
        name: string;
        location: string;
        ip: string;
        version: string;
        status: string;
        firstSeen: string;
        lastSeen: string;
    };
};

const MAX_CODE_LENGTH = 6;

const KIOSK_STORAGE_KEYS = {
    activated: "kioskActivated",
    activationCode: "kioskActivationCode",
    deviceId: "kioskDeviceId",
    info: "kioskInfo",
    name: "kioskName",
    location: "kioskLocation",
    ip: "kioskIp",
    version: "kioskVersion",
    status: "kioskStatus",
    firstSeen: "kioskFirstSeen",
    lastSeen: "kioskLastSeen",
    activatedAt: "kioskActivatedAt",
    config: "kioskConfig",
    systemName: "kioskSystemName",
    logoUrl: "kioskLogoUrl",
} as const;

const KIOSK_META_STORAGE_KEY = "kioskConfigMeta";
const KIOSK_CONFIG_UPDATED_EVENT = "kiosk-config-updated";

const numericKeyboardKeys = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "delete",
    "0",
    "enter",
] as const;

function saveKioskActivateToLocalStorage(
    activationCode: string,
    result: KioskActivateResponse
) {
    const deviceId = result.deviceId ?? result.kiosk?.deviceId ?? "";

    localStorage.setItem(KIOSK_STORAGE_KEYS.activated, "true");
    localStorage.setItem(KIOSK_STORAGE_KEYS.activationCode, activationCode);
    localStorage.setItem(KIOSK_STORAGE_KEYS.deviceId, deviceId);
    localStorage.setItem(
        KIOSK_STORAGE_KEYS.info,
        JSON.stringify(result.kiosk ?? null)
    );
    localStorage.setItem(
        KIOSK_STORAGE_KEYS.activatedAt,
        new Date().toISOString()
    );

    if (result.kiosk) {
        localStorage.setItem(KIOSK_STORAGE_KEYS.name, result.kiosk.name);
        localStorage.setItem(KIOSK_STORAGE_KEYS.location, result.kiosk.location);
        localStorage.setItem(KIOSK_STORAGE_KEYS.ip, result.kiosk.ip);
        localStorage.setItem(KIOSK_STORAGE_KEYS.version, result.kiosk.version);
        localStorage.setItem(KIOSK_STORAGE_KEYS.status, result.kiosk.status);
        localStorage.setItem(KIOSK_STORAGE_KEYS.firstSeen, result.kiosk.firstSeen);
        localStorage.setItem(KIOSK_STORAGE_KEYS.lastSeen, result.kiosk.lastSeen);
    }

    return deviceId;
}

function saveKioskConfigToLocalStorage(config: KioskConfigResponse) {
    const nextTheme = normalizeKioskTheme(config.theme);

    if (!nextTheme) {
        throw new Error("ข้อมูล themeColor จาก API ไม่ถูกต้อง");
    }

    localStorage.setItem(KIOSK_STORAGE_KEYS.config, JSON.stringify(config));
    localStorage.setItem(KIOSK_STORAGE_KEYS.systemName, config.systemName);
    localStorage.setItem(KIOSK_STORAGE_KEYS.status, config.status);
    localStorage.setItem(KIOSK_STORAGE_KEYS.logoUrl, nextTheme.logoUrl ?? "");

    localStorage.setItem(
        KIOSK_META_STORAGE_KEY,
        JSON.stringify({
            systemName: config.systemName,
            status: config.status,
        })
    );

    saveKioskThemeToStorage(nextTheme);
    applyKioskThemeToRoot(nextTheme);

    window.dispatchEvent(
        new CustomEvent<KioskConfigResponse>(KIOSK_CONFIG_UPDATED_EVENT, {
            detail: config,
        })
    );
}

function getErrorMessage(value: unknown, fallback: string) {
    if (
        value &&
        typeof value === "object" &&
        "message" in value &&
        typeof value.message === "string"
    ) {
        return value.message;
    }

    return fallback;
}

function KioskActivatePage() {
    const router = useRouter();

    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const isLocked = submitting || Boolean(successMessage);

    const canSubmit = useMemo(() => {
        return code.trim().length === MAX_CODE_LENGTH && !isLocked;
    }, [code, isLocked]);

    const clearMessage = useCallback(() => {
        setError("");
        setSuccessMessage("");
    }, []);

    const handleNumberClick = useCallback(
        (value: string) => {
            if (isLocked) return;

            setCode((prev) => {
                if (prev.length >= MAX_CODE_LENGTH) return prev;
                return `${prev}${value}`;
            });

            clearMessage();
        },
        [clearMessage, isLocked]
    );

    const handleDelete = useCallback(() => {
        if (isLocked) return;

        setCode((prev) => prev.slice(0, -1));
        clearMessage();
    }, [clearMessage, isLocked]);

    const handleConfirm = useCallback(async () => {
        if (isLocked) return;

        const activationCode = code.trim();

        if (!activationCode) {
            setError("กรุณากรอก Activation Code");
            return;
        }

        if (activationCode.length !== MAX_CODE_LENGTH) {
            setError(`กรุณากรอก Activation Code ให้ครบ ${MAX_CODE_LENGTH} หลัก`);
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setSuccessMessage("");

            const response = await fetch("/api/kiosk/activate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: activationCode,
                }),
                cache: "no-store",
            });

            const result = (await response.json().catch(() => null)) as
                | KioskActivateResponse
                | null;

            if (!response.ok || !result?.success) {
                throw new Error(
                    getErrorMessage(result, "เปิดใช้งานตู้ Kiosk ไม่สำเร็จ")
                );
            }

            const deviceId = saveKioskActivateToLocalStorage(
                activationCode,
                result
            );

            if (!deviceId) {
                throw new Error("ไม่พบ deviceId จากการ Activate");
            }

            const configResponse = await fetch("/api/kiosk/config", {
                method: "GET",
                cache: "no-store",
            });

            const kioskConfig = (await configResponse.json().catch(
                () => null
            )) as KioskConfigResponse | null;

            if (!configResponse.ok || !kioskConfig?.theme) {
                throw new Error("โหลดข้อมูล Config ของตู้ Kiosk ไม่สำเร็จ");
            }

            saveKioskConfigToLocalStorage(kioskConfig);

            setSuccessMessage(result.message || "Activation successful");

            setTimeout(() => {
                router.replace("/landing/dashboard");
            }, 800);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "เกิดข้อผิดพลาด กรุณาลองใหม่"
            );
        } finally {
            setSubmitting(false);
        }
    }, [code, isLocked, router]);

    useEffect(() => {
        const handlePhysicalKeyboard = (event: KeyboardEvent) => {
            if (isLocked) return;

            if (/^\d$/.test(event.key)) {
                event.preventDefault();
                handleNumberClick(event.key);
                return;
            }

            if (event.key === "Backspace") {
                event.preventDefault();
                handleDelete();
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                void handleConfirm();
            }
        };

        window.addEventListener("keydown", handlePhysicalKeyboard);

        return () => {
            window.removeEventListener("keydown", handlePhysicalKeyboard);
        };
    }, [handleNumberClick, handleDelete, handleConfirm, isLocked]);

    return (
        <main className="kiosk-activate-page">
            <div className="kiosk-activate-page__content">
                <section className="kiosk-activate">
                    <div className="kiosk-activate__icon">
                        <LuMonitor size={34} />
                    </div>

                    <div className="kiosk-activate__header">
                        <h1>Smart Carpark</h1>
                        <p>กรอก Activation Code สำหรับเปิดใช้งานตู้ Kiosk</p>
                    </div>

                    <div className="kiosk-activate__form-area">
                        <div className="kiosk-code-card">
                            <label className="kiosk-code-card__label">
                                Activation Code
                            </label>

                            <div className="kiosk-code-card__input-box">
                                <input
                                    value={code}
                                    placeholder="000000"
                                    readOnly
                                    aria-label="Activation Code"
                                    className={`kiosk-code-card__input ${code ? "is-filled" : ""
                                        }`}
                                />
                            </div>
                        </div>

                        <p
                            className={
                                error
                                    ? "kiosk-activate__message kiosk-activate__message--error"
                                    : "kiosk-activate__message"
                            }
                        >
                            {error ||
                                "กรอกตัวเลข Activation Code ที่ได้รับจากระบบ Admin"}
                        </p>

                        {successMessage ? (
                            <div className="kiosk-alert kiosk-alert--success">
                                <LuCheck size={18} />
                                <span>
                                    {successMessage} กำลังเข้าสู่หน้า Dashboard...
                                </span>
                            </div>
                        ) : null}

                        {error ? (
                            <div className="kiosk-alert kiosk-alert--error">
                                <LuX size={18} />
                                <span>{error}</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="kiosk-keyboard" aria-label="Numeric Keyboard">
                        {numericKeyboardKeys.map((key) => {
                            if (key === "delete") {
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className="kiosk-keyboard__key kiosk-keyboard__key--delete"
                                        onClick={handleDelete}
                                        disabled={isLocked}
                                        aria-label="ลบ"
                                    >
                                        <LuDelete size={24} />
                                    </button>
                                );
                            }

                            if (key === "enter") {
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className="kiosk-keyboard__key kiosk-keyboard__key--enter"
                                        onClick={() => void handleConfirm()}
                                        disabled={!canSubmit}
                                    >
                                        {submitting ? (
                                            <LuLoader
                                                className="kiosk-keyboard__loader"
                                                size={22}
                                            />
                                        ) : (
                                            "Enter"
                                        )}
                                    </button>
                                );
                            }

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className="kiosk-keyboard__key"
                                    onClick={() => handleNumberClick(key)}
                                    disabled={
                                        isLocked || code.length >= MAX_CODE_LENGTH
                                    }
                                >
                                    {key}
                                </button>
                            );
                        })}
                    </div>

                    <p className="kiosk-activate__footer">
                        หาก Code หมดอายุ กรุณาสร้าง Activation Code ใหม่จากหน้า Admin
                    </p>
                </section>
            </div>
        </main>
    );
}

export default KioskActivatePage;