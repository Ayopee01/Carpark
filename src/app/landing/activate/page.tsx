"use client";

// Import Libraries
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Libs
import { saveDeviceCredential } from "@/src/app/lib/device";
import { sendHeartbeat } from "@/src/app/lib/heartbeat";
import {
    applyKioskThemeToRoot,
    normalizeKioskTheme,
    saveKioskThemeToStorage,
} from "@/src/app/lib/kioskTheme";
import { KIOSK_CONFIG_UPDATED_EVENT } from "@/src/app/lib/storageKeys";

// Types
import type { KioskConfigResponse } from "@/src/app/lib/kioskTheme";
import type { DeviceActivateResponse } from "@/src/app/type/client";

// CSS
import "@/src/app/css/KioskActivate.css";

// Icons
import { LuCheck, LuDelete, LuLoader, LuMonitor, LuX } from "react-icons/lu";

// ------------------------------- Config -------------------------------

// กำหนดจำนวนหลักของ Activation Code
const MAX_CODE_LENGTH = 6;

// กำหนดปุ่มตัวเลขสำหรับคีย์บอร์ดบนหน้าจอ
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

// ------------------------------- Function -------------------------------

// Function สำหรับบันทึก config/theme หลัง Activate สำเร็จ เพื่อให้หน้าอื่นนำไปใช้ต่อทันที
function saveKioskConfigToLocalStorage(config: KioskConfigResponse) {
    const nextTheme = normalizeKioskTheme(config.theme);

    if (!nextTheme) {
        throw new Error("invalid_theme");
    }

    saveKioskThemeToStorage(nextTheme);
    applyKioskThemeToRoot(nextTheme);

    window.dispatchEvent(
        new CustomEvent<KioskConfigResponse>(KIOSK_CONFIG_UPDATED_EVENT, {
            detail: config,
        })
    );
}

function KioskActivatePage() {
    const router = useRouter();
    const t = useTranslations("Activate");
    const common = useTranslations("Common");

    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [successTarget, setSuccessTarget] =
        useState<"dashboard" | "barrier">("dashboard");

    const isLocked = submitting || Boolean(successMessage);

    // ตรวจว่า code ครบจำนวนหลักและหน้ายังไม่ถูกล็อกอยู่หรือไม่
    const canSubmit = useMemo(
        () => code.trim().length === MAX_CODE_LENGTH && !isLocked,
        [code, isLocked]
    );

    // Function สำหรับล้างข้อความ error/success เมื่อผู้ใช้เริ่มกรอกใหม่
    const clearMessage = useCallback(() => {
        setError("");
        setSuccessMessage("");
    }, []);

    // Function สำหรับเพิ่มตัวเลขจากคีย์บอร์ดบนหน้าจอ
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

    // Function สำหรับลบตัวเลขล่าสุด
    const handleDelete = useCallback(() => {
        if (isLocked) return;

        setCode((prev) => prev.slice(0, -1));
        clearMessage();
    }, [clearMessage, isLocked]);

    // Function สำหรับส่ง Activation Code ไปให้ Backend และบันทึก credential ของอุปกรณ์
    const handleConfirm = useCallback(async () => {
        if (isLocked) return;

        const activationCode = code.trim();

        if (!activationCode) {
            setError(t("errorRequired"));
            return;
        }

        if (activationCode.length !== MAX_CODE_LENGTH) {
            setError(t("errorLength", { length: MAX_CODE_LENGTH }));
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setSuccessMessage("");
            setSuccessTarget("dashboard");

            const response = await fetch("/api/client/activate", {
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
                | DeviceActivateResponse
                | null;

            if (!response.ok || !result?.success) {
                throw new Error(t("errorActivateFailed"));
            }

            // บันทึก device credential เพื่อใช้กับ check-in, heartbeat และ API ที่ต้องยืนยันตัวตน
            saveDeviceCredential({
                deviceId: result.deviceId,
                deviceToken: result.deviceToken,
                deviceType: result.deviceType,
                deviceName: result.deviceName,
                location: result.location,
                status: result.status,
                activatedAt: new Date().toISOString(),
                gateId: result.gateId ?? null,
                cameraId: result.cameraId ?? null,
                direction: result.direction ?? null,
            });

            // ถ้าเป็น Barrier Gate ให้ heartbeat และ redirect ไปหน้า Barrier Gate
            if (result.deviceType === "barrier_gate") {
                await sendHeartbeat("barrier-gate").catch((err) => {
                    console.warn("barrier-gate heartbeat after activation failed:", err);
                });

                setSuccessTarget("barrier");
                setSuccessMessage(result.message || t("successFallback"));

                setTimeout(() => {
                    router.replace("/landing/barrier-gate");
                }, 800);
                return;
            }

            // ถ้าเป็น Kiosk ให้โหลด config/theme ล่าสุดก่อนเข้า dashboard
            const configResponse = await fetch("/api/devices/config", {
                method: "GET",
                cache: "no-store",
            });

            const kioskConfig = (await configResponse.json().catch(
                () => null
            )) as KioskConfigResponse | null;

            if (!configResponse.ok || !kioskConfig?.theme) {
                throw new Error(t("errorConfigFailed"));
            }

            try {
                saveKioskConfigToLocalStorage(kioskConfig);
            } catch {
                throw new Error(t("errorThemeInvalid"));
            }

            await sendHeartbeat("kiosk").catch((err) => {
                console.warn("kiosk heartbeat after activation failed:", err);
            });

            setSuccessMessage(result.message || t("successFallback"));

            setTimeout(() => {
                router.replace("/landing/dashboard");
            }, 800);
        } catch (err) {
            // แสดงข้อความ error ที่รองรับการแปลภาษา ถ้าไม่รู้จักให้ใช้ข้อความกลาง
            const localizedErrors = new Set([
                t("errorActivateFailed"),
                t("errorConfigFailed"),
                t("errorThemeInvalid"),
            ]);
            const message = err instanceof Error ? err.message : "";

            setError(localizedErrors.has(message) ? message : t("errorUnexpected"));
        } finally {
            setSubmitting(false);
        }
    }, [code, isLocked, router, t]);

    // รองรับการกรอกผ่าน physical keyboard นอกจากปุ่มบนหน้าจอ
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
                        <h1>{t("title")}</h1>
                        <p>{t("subtitle")}</p>
                    </div>

                    <div className="kiosk-activate__form-area">
                        <div className="kiosk-code-card">
                            <label className="kiosk-code-card__label">
                                {t("codeLabel")}
                            </label>

                            <div className="kiosk-code-card__input-box">
                                <input
                                    value={code}
                                    placeholder="000000"
                                    readOnly
                                    aria-label={t("codeLabel")}
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
                                t("hint")}
                        </p>

                        {successMessage ? (
                            <div className="kiosk-alert kiosk-alert--success">
                                <LuCheck size={18} />
                                <span>
                                    {t(
                                        successTarget === "barrier"
                                            ? "redirectingBarrier"
                                            : "redirectingDashboard",
                                        {
                                        message: successMessage,
                                        }
                                    )}
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
                                        aria-label={t("delete")}
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
                                            common("enter")
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
                        {t("footer")}
                    </p>
                </section>
            </div>
        </main>
    );
}

export default KioskActivatePage;
