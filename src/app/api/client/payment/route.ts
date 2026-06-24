import { NextRequest, NextResponse } from "next/server";

// API Route สำหรับ Payment โดยใช้ plateNo
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
                { message: "Invalid payment payload" },
                { status: 400 }
            );
        }

        const {
            plateNo,
            ...payment
        } = body as {
            plateNo?: string;
            method?: string;
            amount?: number;
            deviceId?: string;
        };

        if (!plateNo?.trim()) {
            return NextResponse.json(
                { message: "plateNo is required" },
                { status: 400 }
            );
        }

        const deviceId = request.headers.get("x-device-id")?.trim();
        const deviceToken = request.headers.get("x-device-token")?.trim();

        const response = await fetch(
            `${baseUrl}/api/v1/client/${encodeURIComponent(plateNo.trim())}/payment`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(deviceId ? { "x-device-id": deviceId } : {}),
                    ...(deviceToken ? { "x-device-token": deviceToken } : {}),
                },
                body: JSON.stringify(payment),
                cache: "no-store",
            }
        );

        return NextResponse.json(await response.json().catch(() => null), {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Unable to process payment",
                reason: error instanceof Error ? error.message : "network_error",
            },
            { status: 502 }
        );
    }
}
