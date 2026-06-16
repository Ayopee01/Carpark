import { NextResponse } from "next/server";
import { getBackendBaseUrl, readJsonResponse } from "@/src/app/lib/serverApi";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const baseUrl = getBackendBaseUrl();
        if (!baseUrl) {
            return NextResponse.json(
                { message: "API base URL is not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(`${baseUrl}/api/v1/devices/config`, {
            cache: "no-store",
        });

        const data = await readJsonResponse(response);
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
