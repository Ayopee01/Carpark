import { NextRequest } from "next/server";

export function getBackendBaseUrl() {
    return (
        process.env.NEXT_PUBLIC_API_BASE_URL ??
        process.env.BASE_URL ??
        process.env.BaseURL ??
        ""
    ).replace(/\/$/, "");
}

export function getForwardedDeviceHeaders(request: NextRequest) {
    const deviceId = request.headers.get("x-device-id")?.trim();
    const deviceToken = request.headers.get("x-device-token")?.trim();

    return {
        ...(deviceId ? { "x-device-id": deviceId } : {}),
        ...(deviceToken ? { "x-device-token": deviceToken } : {}),
    };
}

export async function readJsonResponse(response: Response) {
    return response.json().catch(() => null) as Promise<unknown>;
}
