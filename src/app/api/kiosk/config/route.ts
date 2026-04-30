import { NextRequest, NextResponse } from "next/server";

function getBaseUrl() {
    return process.env.BASE_URL;
}

export async function GET(request: NextRequest) {
    try {
        const baseUrl = getBaseUrl();

        if (!baseUrl) {
            return NextResponse.json(
                { message: "Missing BaseURL or BASE_URL" },
                { status: 500 }
            );
        }

        const authorization = request.headers.get("authorization");

        const response = await fetch(`${baseUrl}/api/v1/kiosk/config`, {
            method: "GET",
            headers: {
                ...(authorization ? { Authorization: authorization } : {}),
            },
            cache: "no-store",
        });

        const result = await response.json().catch(() => null);

        return NextResponse.json(result, { status: response.status });
    } catch (err) {
        return NextResponse.json(
            {
                message:
                    err instanceof Error
                        ? err.message
                        : "โหลดข้อมูล kiosk config ไม่สำเร็จ",
            },
            { status: 500 }
        );
    }
}