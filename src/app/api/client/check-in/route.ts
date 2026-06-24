import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// API Route สำหรับ Check-in Device
export async function POST(request: NextRequest) {
    try {
        const baseUrl = process.env.BASE_URL ?? "";

        if (!baseUrl) {
            return NextResponse.json(
                { message: "API base URL is not configured" },
                { status: 500 }
            );
        }

        const body = await request.json().catch(() => null);

        if (!body || typeof body !== "object") {
            return NextResponse.json(
                { message: "Invalid check-in payload" },
                { status: 400 }
            );
        }

        const deviceId = request.headers.get("x-device-id")?.trim();
        const deviceToken = request.headers.get("x-device-token")?.trim();

        // Request API สำหรับ Check-in Device
        const response = await fetch(`${baseUrl}/api/v1/client/check-in`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(deviceId ? { "x-device-id": deviceId } : {}),
                ...(deviceToken ? { "x-device-token": deviceToken } : {}),
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        return NextResponse.json(await response.json().catch(() => null), {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Failed to check in device",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
