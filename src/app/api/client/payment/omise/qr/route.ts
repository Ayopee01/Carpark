import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const baseUrl = process.env.BASE_URL ?? "";
    const chargeId = request.nextUrl.searchParams.get("chargeId")?.trim() ?? "";

    if (!baseUrl) {
        return NextResponse.json(
            { message: "API base URL is not configured" },
            { status: 500 }
        );
    }

    if (!chargeId) {
        return NextResponse.json(
            { message: "chargeId is required" },
            { status: 400 }
        );
    }

    try {
        const url = new URL("/api/v1/client/payment/omise/qr", baseUrl);
        url.searchParams.set("chargeId", chargeId);

        const response = await fetch(url.toString(), {
            method: "GET",
            cache: "no-store",
        });

        if (!response.ok) {
            const contentType =
                response.headers.get("content-type") ?? "application/json";
            const text = await response.text();

            return new NextResponse(text, {
                status: response.status,
                headers: {
                    "Content-Type": contentType,
                    "Cache-Control": "no-store",
                },
            });
        }

        const contentType = response.headers.get("content-type") ?? "image/svg+xml";
        const body = await response.arrayBuffer();

        return new NextResponse(body, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Unable to load Omise QR image",
                reason: error instanceof Error ? error.message : "network_error",
            },
            { status: 502 }
        );
    }
}
