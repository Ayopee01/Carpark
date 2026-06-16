import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getBaseUrl() {
    return (process.env.BASE_URL ?? process.env.BaseURL ?? "").replace(/\/$/, "");
}

function getLogoTarget(src: string, baseUrl: string) {
    if (src.startsWith("/")) {
        return `${baseUrl}${src}`;
    }

    const target = new URL(src);
    const backend = new URL(baseUrl);

    if (target.origin !== backend.origin) {
        throw new Error("Logo URL is not allowed");
    }

    return target.toString();
}

export async function GET(request: NextRequest) {
    try {
        const baseUrl = getBaseUrl();

        if (!baseUrl) {
            return new Response("Missing BaseURL or BASE_URL", { status: 500 });
        }

        const src = request.nextUrl.searchParams.get("src")?.trim();
        const deviceId =
            request.headers.get("x-device-id")?.trim() ||
            request.nextUrl.searchParams.get("deviceId")?.trim();
        const deviceToken =
            request.headers.get("x-device-token")?.trim() ||
            request.nextUrl.searchParams.get("deviceToken")?.trim();
        const deviceType = request.nextUrl.searchParams.get("deviceType")?.trim();

        if (!src) {
            return new Response("src is required", { status: 400 });
        }

        const target = getLogoTarget(src, baseUrl);
        const response = await fetch(target, {
            method: "GET",
            headers: {
                Accept: "image/*,*/*;q=0.8",
                ...(deviceId ? { "X-Device-Id": deviceId } : {}),
                ...(deviceToken ? { "X-Device-Token": deviceToken } : {}),
                ...(deviceType ? { "X-Device-Type": deviceType } : {}),
            },
            cache: "no-store",
        });

        if (!response.ok || !response.body) {
            console.warn("Logo upstream request failed", {
                status: response.status,
                target,
                hasDeviceId: Boolean(deviceId),
                deviceType: deviceType || null,
            });

            return new Response("Logo not found", { status: response.status || 404 });
        }

        return new Response(response.body, {
            status: 200,
            headers: {
                "Content-Type":
                    response.headers.get("content-type") ?? "application/octet-stream",
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        });
    } catch (error) {
        return new Response(
            error instanceof Error ? error.message : "Failed to load logo",
            { status: 500 }
        );
    }
}
