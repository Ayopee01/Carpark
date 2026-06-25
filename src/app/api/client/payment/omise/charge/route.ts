import { NextRequest, NextResponse } from "next/server";

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
                { message: "Invalid Omise charge payload" },
                { status: 400 }
            );
        }

        const deviceId = request.headers.get("x-device-id")?.trim();
        const deviceToken = request.headers.get("x-device-token")?.trim();

        const response = await fetch(
            `${baseUrl}/api/v1/client/payment/omise/charge`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(deviceId ? { "x-device-id": deviceId } : {}),
                    ...(deviceToken ? { "x-device-token": deviceToken } : {}),
                },
                body: JSON.stringify(body),
                cache: "no-store",
            }
        );

        return NextResponse.json(await response.json().catch(() => null), {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Unable to create Omise charge",
                reason: error instanceof Error ? error.message : "network_error",
            },
            { status: 502 }
        );
    }
}
