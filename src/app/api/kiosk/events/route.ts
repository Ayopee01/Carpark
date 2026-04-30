import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBaseUrl() {
    return process.env.BaseURL ?? process.env.BASE_URL ?? "";
}

export async function GET(request: NextRequest) {
    const baseUrl = getBaseUrl();

    if (!baseUrl) {
        return new Response("Missing BaseURL or BASE_URL", {
            status: 500,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    }

    const authorization = request.headers.get("authorization");

    const upstream = await fetch(`${baseUrl}/api/v1/kiosk/events`, {
        method: "GET",
        headers: {
            Accept: "text/event-stream",
            ...(authorization ? { Authorization: authorization } : {}),
        },
        cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
        return new Response("Cannot connect to kiosk event stream", {
            status: upstream.status || 500,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    }

    return new Response(upstream.body, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}