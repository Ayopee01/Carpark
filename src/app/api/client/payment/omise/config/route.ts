import { NextResponse } from "next/server";

function getPaymentWebSocketUrl(baseUrl: string) {
    const url = new URL("/api/v1/client/payment/ws", baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
}

export async function GET() {
    const publicKey =
        process.env.OMISE_PUBLIC_KEY ??
        process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY ??
        "";
    const baseUrl = process.env.BASE_URL ?? "";

    if (!publicKey) {
        return NextResponse.json(
            { message: "Omise public key is not configured" },
            { status: 500 }
        );
    }

    if (!baseUrl) {
        return NextResponse.json(
            { message: "API base URL is not configured" },
            { status: 500 }
        );
    }

    return NextResponse.json({
        publicKey,
        paymentWebSocketUrl: getPaymentWebSocketUrl(baseUrl),
    });
}
