import { NextRequest, NextResponse } from "next/server";
import {
    getBackendBaseUrl,
    getForwardedDeviceHeaders,
    readJsonResponse,
} from "@/src/app/lib/serverApi";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const baseUrl = getBackendBaseUrl();
        const { id } = await context.params;
        const deviceId =
            request.headers.get("x-device-id")?.trim() ||
            request.nextUrl.searchParams.get("deviceId")?.trim();
        const params = new URLSearchParams();
        if (deviceId) params.set("deviceId", deviceId);

        const response = await fetch(
            `${baseUrl}/api/v1/client/transaction/${encodeURIComponent(id)}?${params}`,
            {
                headers: getForwardedDeviceHeaders(request),
                cache: "no-store",
            }
        );

        return NextResponse.json(await readJsonResponse(response), {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Unable to load transaction",
                reason: error instanceof Error ? error.message : "network_error",
            },
            { status: 502 }
        );
    }
}
