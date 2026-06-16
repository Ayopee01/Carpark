import { NextRequest, NextResponse } from "next/server";
import {
    getBackendBaseUrl,
    getForwardedDeviceHeaders,
    readJsonResponse,
} from "@/src/app/lib/serverApi";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await fetch(
            `${getBackendBaseUrl()}/api/v1/client/payment`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getForwardedDeviceHeaders(request),
                },
                body: JSON.stringify(body),
                cache: "no-store",
            }
        );

        return NextResponse.json(await readJsonResponse(response), {
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
