import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, readJsonResponse } from "@/src/app/lib/serverApi";

export async function POST(request: NextRequest) {
    try {
        const baseUrl = getBackendBaseUrl();

        if (!baseUrl) {
            return NextResponse.json(
                { success: false, message: "BaseURL is not configured" },
                { status: 500 }
            );
        }

        const body = await request.json();

        const response = await fetch(`${baseUrl}/api/v1/client/activate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                code: body.code ?? "",
            }),
            cache: "no-store",
        });

        const data = await readJsonResponse(response);

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Failed to activate barrier gate",
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            },
            { status: 500 }
        );
    }
}
