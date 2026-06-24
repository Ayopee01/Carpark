// Types
import type { DeviceType, StoredDeviceCredential } from "@/src/app/type/client";

export type UiDeviceType = "kiosk" | "barrier-gate";

// กำหนดชื่อ KEY สำหรับเก็บข้อมูลอุปกรณ์ใน localStorage
const DEVICE_CREDENTIAL_KEY = "carparkDeviceCredential";

// Function สำหรับตรวจสอบ localStorage ว่าสามารถใช้งานได้หรือไม่
function canUseLocalStorage() {
    return typeof window !== "undefined" && Boolean(window.localStorage);
}

// Function สำหรับแปลงค่า device type ที่อาจมีรูปแบบต่างกันให้เป็น DeviceType ที่ถูกต้อง
export function normalizeDeviceType(value: unknown): DeviceType | null {
    if (value === "kiosk") return "kiosk";
    if (value === "barrier_gate" || value === "barrier-gate") {
        return "barrier_gate";
    }
    return null;
}

// Function สำหรับแปลง DeviceType เป็น UiDeviceType
export function toUiDeviceType(type: DeviceType): UiDeviceType {
    return type === "barrier_gate" ? "barrier-gate" : "kiosk";
}

// Function สำหรับดึงข้อมูล Credential ของอุปกรณ์จาก localStorage และตรวจสอบความถูกต้องของข้อมูลก่อนนำไปใช้งาน ถ้าข้อมูลไม่ครบหรือไม่ถูกต้องจะคืนค่า null
export function getStoredDeviceCredential(): StoredDeviceCredential | null {
    if (!canUseLocalStorage()) return null;

    // พยายามดึงข้อมูลจาก localStorage และแปลงเป็น JSON ถ้ามีข้อผิดพลาดในการดึงหรือแปลงจะจับและคืนค่า null
    try {
        const raw = localStorage.getItem(DEVICE_CREDENTIAL_KEY);
        if (!raw) return null;

        // แปลงข้อมูลที่ดึงมาเป็น JSON และตรวจสอบความถูกต้องของข้อมูลก่อนคืนค่า ถ้าข้อมูลไม่ครบหรือไม่ถูกต้องจะคืนค่า null
        const value = JSON.parse(raw) as Partial<StoredDeviceCredential>;
        // แปลงค่า deviceType ให้เป็น DeviceType ที่ถูกต้อง ถ้าไม่สามารถแปลงได้จะคืนค่า null
        const deviceType = normalizeDeviceType(value.deviceType);

        // ตรวจสอบว่าข้อมูลที่จำเป็นครบถ้วนและถูกต้อง ถ้าไม่ครบหรือไม่ถูกต้องจะคืนค่า null
        if (
            !value.deviceId ||
            !value.deviceToken ||
            !deviceType ||
            !value.deviceName ||
            !value.status
        ) {
            return null;
        }

        // ถ้าข้อมูลครบถ้วนและถูกต้องจะคืนค่า Credential ของอุปกรณ์ในรูปแบบ StoredDeviceCredential
        return {
            deviceId: value.deviceId,
            deviceToken: value.deviceToken,
            deviceType,
            deviceName: value.deviceName,
            location: value.location ?? null,
            status: value.status,
            activatedAt: value.activatedAt,
        };
    } catch {
        return null;
    }
}

// Function สำหรับ Save ข้อมูลอุปกรณ์ลงใน localStorage
export function saveDeviceCredential(credential: StoredDeviceCredential) {
    if (!canUseLocalStorage()) return;
    localStorage.setItem(DEVICE_CREDENTIAL_KEY, JSON.stringify(credential));
}

// Function สำหรับ Update ข้อมูลอุปกรณ์ที่มีอยู่ใน localStorage โดยไม่ลบข้อมูลเดิม
export function updateStoredDeviceCredential(
    updates: Partial<StoredDeviceCredential>
) {
    const current = getStoredDeviceCredential();
    if (!current) return;
    saveDeviceCredential({ ...current, ...updates });
}

// Function สำหรับ Clear ข้อมูลอุปกรณ์ออกจาก localStorage เมื่อมีการ Logout หรือ Unauthorized
export function clearDeviceStorage() {
    if (!canUseLocalStorage()) return;
    localStorage.removeItem(DEVICE_CREDENTIAL_KEY);
}

// Function สำหรับดึงข้อมูล Credential ของอุปกรณ์ตามประเภทที่กำหนด (ถ้ามี)
function getCredentialForType(
    type?: UiDeviceType
): StoredDeviceCredential | null {
    const credential = getStoredDeviceCredential();
    if (!credential) return null;
    if (type && toUiDeviceType(credential.deviceType) !== type) return null;
    return credential;
}

// Function สำหรับดึง Device ID และ Token จาก localStorage เพื่อใช้ในการ Authentication กับ API ต่างๆ
export function getDeviceId(type?: UiDeviceType): string | null {
    return getCredentialForType(type)?.deviceId ?? null;
}

// Function สำหรับดึง Device Token จาก localStorage เพื่อใช้ในการ Authentication กับ API ต่างๆ
export function getDeviceToken(type?: UiDeviceType): string | null {
    return getCredentialForType(type)?.deviceToken ?? null;
}

// Function สำหรับสร้าง Headers ที่จำเป็นสำหรับการ Authentication ของอุปกรณ์ใน API Request ต่างๆ โดยจะตรวจสอบประเภทของอุปกรณ์ถ้ามีการระบุ
export function getDeviceAuthHeaders(
    type?: UiDeviceType
): Record<string, string> {
    const credential = getCredentialForType(type);
    if (!credential) return {};

    const deviceId = credential.deviceId.trim();
    const deviceToken = credential.deviceToken.trim();

    // ถ้าไม่มีข้อมูลที่จำเป็นจะคืนค่า Headers ว่าง
    return {
        ...(deviceId ? { "x-device-id": deviceId } : {}),
        ...(deviceToken ? { "x-device-token": deviceToken } : {}),
    };
}

// Function สำหรับดึงประเภทของอุปกรณ์ที่ถูก Activate อยู่ในปัจจุบัน (ถ้ามี)
export function getActivatedDeviceType(): UiDeviceType | null {
    const credential = getStoredDeviceCredential();
    return credential ? toUiDeviceType(credential.deviceType) : null;
}

// Function สำหรับตรวจสอบสถานะการ Activate ของอุปกรณ์ ถ้ามีการ Activate อยู่จะคืนค่า true ถ้าไม่มีหรือข้อมูลไม่ครบจะคืนค่า false
export function handleDeviceResponseStatus(
    response: Response,
    data?: { message?: string; status?: string } | null
) {
    if (response.status === 401) {
        clearDeviceStorage();
        window.location.replace("/landing/activate");
        return true;
    }

    const isMaintenance =
        response.status === 403 &&
        (data?.status === "maintenance" ||
            data?.message?.toLowerCase().includes("maintenance"));

    if (isMaintenance) {
        window.location.replace("/landing/maintenance");
        return true;
    }

    return false;
}

export type { DeviceType, StoredDeviceCredential };
