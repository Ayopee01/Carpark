import { NextRequest, NextResponse } from "next/server";

function getBaseUrl() {
    return (process.env.BASE_URL ?? process.env.BaseURL ?? "").replace(/\/$/, "");
}

function normalizeLogoUrl(logoUrl: unknown, baseUrl: string) {
    if (!logoUrl || typeof logoUrl !== "string") {
        return null;
    }

    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
        return logoUrl;
    }

    if (logoUrl.startsWith("/")) {
        return `${baseUrl}${logoUrl}`;
    }

    return `${baseUrl}/${logoUrl}`;
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

        if (!response.ok || !result) {
            return NextResponse.json(result, { status: response.status });
        }

        const normalizedResult = {
            ...result,
            theme: {
                ...result.theme,
                logoUrl: normalizeLogoUrl(result.theme?.logoUrl, baseUrl),
            },
        };

        return NextResponse.json(normalizedResult, {
            status: response.status,
        });
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