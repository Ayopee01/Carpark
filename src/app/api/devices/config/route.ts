import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// API Route สำหรับ GET เพื่อดึงข้อมูล Config ของอุปกรณ์ Devices
export async function GET() {
    try {
        const baseUrl = process.env.BASE_URL ?? "";

        if (!baseUrl) {
            return NextResponse.json(
                { message: "API base URL is not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(`${baseUrl}/api/v1/devices/config`, {
            method: "GET",
            cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as unknown;

        if (
            data &&
            typeof data === "object" &&
            "theme" in data &&
            data.theme &&
            typeof data.theme === "object"
        ) {
            const theme = data.theme as Record<string, unknown>;
            const logoUrl = theme.logoUrl;

            if (typeof logoUrl === "string" && logoUrl.startsWith("/uploads")) {
                theme.logoUrl = `${baseUrl}${logoUrl}`;
            }
        }

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Unable to load device config",
                reason: error instanceof Error ? error.message : "network_error",
            },
            { status: 502 }
        );
    }
}
