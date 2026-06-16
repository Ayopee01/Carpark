import type {
    DeviceType,
    StoredDeviceCredential,
} from "@/src/app/type/client";

export type UiDeviceType = "kiosk" | "barrier-gate";

const DEVICE_CREDENTIAL_KEY = "carparkDeviceCredential";

function canUseLocalStorage() {
    return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function normalizeDeviceType(value: unknown): DeviceType | null {
    if (value === "kiosk") return "kiosk";
    if (value === "barrier_gate" || value === "barrier-gate") {
        return "barrier_gate";
    }
    return null;
}

export function toUiDeviceType(type: DeviceType): UiDeviceType {
    return type === "barrier_gate" ? "barrier-gate" : "kiosk";
}

export function getStoredDeviceCredential(): StoredDeviceCredential | null {
    if (!canUseLocalStorage()) return null;

    try {
        const raw = localStorage.getItem(DEVICE_CREDENTIAL_KEY);
        if (!raw) return null;

        const value = JSON.parse(raw) as Partial<StoredDeviceCredential>;
        const deviceType = normalizeDeviceType(value.deviceType);

        if (
            !value.deviceId ||
            !value.deviceToken ||
            !deviceType ||
            !value.deviceName ||
            !value.status
        ) {
            return null;
        }

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

export function saveDeviceCredential(credential: StoredDeviceCredential) {
    if (!canUseLocalStorage()) return;
    localStorage.setItem(DEVICE_CREDENTIAL_KEY, JSON.stringify(credential));
}

export function updateStoredDeviceCredential(
    updates: Partial<StoredDeviceCredential>
) {
    const current = getStoredDeviceCredential();
    if (!current) return;
    saveDeviceCredential({ ...current, ...updates });
}

export function clearDeviceStorage() {
    if (!canUseLocalStorage()) return;
    localStorage.removeItem(DEVICE_CREDENTIAL_KEY);
}

export function getDeviceId(type?: UiDeviceType): string | null {
    const credential = getStoredDeviceCredential();
    if (!credential) return null;
    if (type && toUiDeviceType(credential.deviceType) !== type) return null;
    return credential.deviceId;
}

export function getDeviceToken(type?: UiDeviceType): string | null {
    const credential = getStoredDeviceCredential();
    if (!credential) return null;
    if (type && toUiDeviceType(credential.deviceType) !== type) return null;
    return credential.deviceToken;
}

export function getDeviceAuthHeaders(
    type?: UiDeviceType
): Record<string, string> {
    const deviceId = getDeviceId(type)?.trim();
    const deviceToken = getDeviceToken(type)?.trim();

    return {
        ...(deviceId ? { "x-device-id": deviceId } : {}),
        ...(deviceToken ? { "x-device-token": deviceToken } : {}),
    };
}

export function getActivatedDeviceType(): UiDeviceType | null {
    const credential = getStoredDeviceCredential();
    return credential ? toUiDeviceType(credential.deviceType) : null;
}

export function getDeviceInfo(type?: UiDeviceType) {
    const credential = getStoredDeviceCredential();
    if (!credential) return null;
    if (type && toUiDeviceType(credential.deviceType) !== type) return null;
    return {
        name: credential.deviceName,
        location: credential.location ?? undefined,
        status: credential.status,
    };
}

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

// Kept for the existing provider; credentials now persist across restarts.
export function ensureFreshActivationForBrowserSession() {}

export type { DeviceType, StoredDeviceCredential };
