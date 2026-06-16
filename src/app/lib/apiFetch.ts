// Wrapper สำหรับ fetch ที่แนบ deviceId และ handle error 401/403
import { getDeviceAuthHeaders, clearDeviceStorage, type UiDeviceType } from "./device";

export async function apiFetch(
    input: RequestInfo,
    init: RequestInit = {},
    type: UiDeviceType = "kiosk"
) {
    const headers = {
        ...(init.headers || {}),
        ...getDeviceAuthHeaders(type),
    };
    const response = await fetch(input, { ...init, headers });
    if (response.status === 401) {
        clearDeviceStorage();
        window.location.replace("/landing/activate");
        throw new Error("Invalid or unregistered deviceId");
    }
    if (response.status === 403) {
        window.location.replace("/landing/maintenance");
        throw new Error("อุปกรณ์อยู่ระหว่างปิดปรับปรุง");
    }
    return response;
}
