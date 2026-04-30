import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const baseUrl = process.env.BASE_URL;

        if (!baseUrl) {
            return NextResponse.json(
                { success: false, message: "BaseURL is not configured" },
                { status: 500 }
            );
        }

        const body = await request.json();

        const response = await fetch(`${baseUrl}/api/v1/kiosk/activate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                code: body.code ?? "",
            }),
            cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Failed to activate kiosk",
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            },
            { status: 500 }
        );
    }
}