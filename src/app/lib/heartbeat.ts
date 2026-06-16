import {
    clearDeviceStorage,
    getDeviceAuthHeaders,
    getStoredDeviceCredential,
    toUiDeviceType,
    updateStoredDeviceCredential,
    type UiDeviceType,
} from "./device";
import type {
    ApiErrorResponse,
    DeviceCheckInResponse,
} from "@/src/app/type/client";

export const DEVICE_OFFLINE_EVENT = "carpark-device-offline";
const HEARTBEAT_PATH = "/api/client/check-in";

function redirectToActivation() {
    window.location.replace("/landing/activate");
}

export async function sendHeartbeat(type?: UiDeviceType) {
    const credential = getStoredDeviceCredential();
    if (!credential) return null;
    if (type && toUiDeviceType(credential.deviceType) !== type) return null;

    let response: Response;
    try {
        response = await fetch(HEARTBEAT_PATH, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getDeviceAuthHeaders(),
            },
            body: JSON.stringify({
                deviceId: credential.deviceId,
                name: credential.deviceName,
                location: credential.location ?? undefined,
            }),
            cache: "no-store",
        });
    } catch (error) {
        window.dispatchEvent(new CustomEvent(DEVICE_OFFLINE_EVENT));
        throw error;
    }

    const data = (await response.json().catch(() => null)) as
        | DeviceCheckInResponse
        | ApiErrorResponse
        | null;

    if (response.status === 401) {
        clearDeviceStorage();
        redirectToActivation();
        return null;
    }

    if (response.status === 403 && data?.status === "maintenance") {
        window.location.replace("/landing/maintenance");
        return null;
    }

    if (!response.ok) {
        throw new Error(data?.message || `Heartbeat failed (${response.status})`);
    }

    const checkIn = data as DeviceCheckInResponse;
    updateStoredDeviceCredential({
        deviceType: checkIn.deviceType,
        status: checkIn.status,
        deviceName: checkIn.device.deviceName,
        location: checkIn.device.deviceLocation,
    });
    return checkIn;
}

export function startHeartbeat(type?: UiDeviceType, intervalMs = 45000) {
    void sendHeartbeat(type).catch((error) => {
        console.warn("Device heartbeat failed:", error);
    });

    return window.setInterval(() => {
        void sendHeartbeat(type).catch((error) => {
            console.warn("Device heartbeat failed:", error);
        });
    }, intervalMs);
}
