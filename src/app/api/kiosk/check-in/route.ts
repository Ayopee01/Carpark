import { NextRequest, NextResponse } from "next/server";
import {
    getBackendBaseUrl,
    getForwardedDeviceHeaders,
    readJsonResponse,
} from "@/src/app/lib/serverApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const baseUrl = getBackendBaseUrl();

        if (!baseUrl) {
            return NextResponse.json(
                { message: "Missing BaseURL or BASE_URL" },
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

        const response = await fetch(`${baseUrl}/api/v1/client/check-in`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getForwardedDeviceHeaders(request),
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const data = await readJsonResponse(response);

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Failed to check in kiosk",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
