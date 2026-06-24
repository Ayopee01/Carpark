import { NextRequest, NextResponse } from "next/server";

// API Route สำหรับ Activate Device
export async function POST(request: NextRequest) {
    try {
        const baseUrl = process.env.BASE_URL ?? "";

        if (!baseUrl) {
            return NextResponse.json(
                { success: false, message: "API base URL is not configured" },
                { status: 500 }
            );
        }

        const body = await request.json();

        // Request API สำหรับ Activate Device
        const response = await fetch(`${baseUrl}/api/v1/client/activate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                code: body.code ?? "",
            }),
            cache: "no-store",
        });

        return NextResponse.json(await response.json().catch(() => null), {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Failed to activate device",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
