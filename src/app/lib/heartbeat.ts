// Lib
import { getStoredDeviceCredential, handleDeviceResponseStatus, toUiDeviceType, updateStoredDeviceCredential } from "./device";
// Types
import type { UiDeviceType } from "./device";
import type { ApiErrorResponse, DeviceCheckInResponse } from "@/src/app/type/client";

// Config เวลาส่ง Heartbeat ของอุปกรณ์ไปยัง Server ทุก 45 วินาที (45000 มิลลิวินาที)
const HEARTBEAT_INTERVAL_MS = 45000;

// Function สำหรับส่ง Heartbeat ของอุปกรณ์ไปยัง Server และอัปเดตข้อมูล Credential ของอุปกรณ์ใน localStorage
export async function sendHeartbeat(type?: UiDeviceType) {
    const credential = getStoredDeviceCredential();
    if (!credential) return null;
    if (type && toUiDeviceType(credential.deviceType) !== type) return null;

    // พยายามส่ง Heartbeat ไปยัง Server ถ้ามีข้อผิดพลาดในการส่งจะจับและแจ้งเตือนว่าอุปกรณ์ไม่สามารถเชื่อมต่อกับ Server ได้
    let response: Response;
    try {
        response = await fetch("/api/client/check-in", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-device-id": credential.deviceId,
                "x-device-token": credential.deviceToken,
            },
            body: JSON.stringify({
                deviceId: credential.deviceId,
                name: credential.deviceName,
                location: credential.location ?? undefined,
            }),
            cache: "no-store",
        });
    } catch (error) {
        throw error;
    }

    // พยายามแปลง response เป็น JSON ถ้ามีข้อผิดพลาดในการแปลงจะจับและคืนค่า null
    const data = (await response.json().catch(() => null)) as
        | DeviceCheckInResponse
        | ApiErrorResponse
        | null;

    if (handleDeviceResponseStatus(response, data)) {
        return null;
    }

    if (!response.ok) {
        throw new Error(data?.message || `Heartbeat failed (${response.status})`);
    }

    // ถ้า response เป็น DeviceCheckInResponse จะอัปเดตข้อมูล Credential ของอุปกรณ์ใน localStorage และคืนค่า DeviceCheckInResponse
    const checkIn = data as DeviceCheckInResponse;
    updateStoredDeviceCredential({
        deviceType: checkIn.deviceType,
        status: checkIn.status,
        deviceName: checkIn.device.deviceName,
        location: checkIn.device.deviceLocation,
    });
    return checkIn;
}

// Function สำหรับเริ่มส่ง Heartbeat ของอุปกรณ์ไปยัง Server ทุก 45 วินาที
export function startHeartbeat() {
    void sendHeartbeat().catch((error) => {
        console.warn("Device heartbeat failed:", error);
    });

    // เริ่มส่ง Heartbeat ของอุปกรณ์ไปยัง Serverตามช่วงเวลาที่กำหนด
    return window.setInterval(() => {
        void sendHeartbeat().catch((error) => {
            console.warn("Device heartbeat failed:", error);
        });
    }, HEARTBEAT_INTERVAL_MS);
}
