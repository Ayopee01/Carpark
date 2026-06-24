import { NextRequest, NextResponse } from "next/server";
import { normalizePlateNo } from "@/src/app/lib/plate";

export const dynamic = "force-dynamic";

// API Route สำหรับ GET เพื่อดึงข้อมูล Transaction
export async function GET(request: NextRequest) {
    try {
        const baseUrl = process.env.BASE_URL ?? "";

        if (!baseUrl) {
            return NextResponse.json(
                { message: "API base URL is not configured" },
                { status: 500 }
            );
        }

        const plateNo = normalizePlateNo(
            request.nextUrl.searchParams.get("plateNo") ?? ""
        );
        const deviceId =
            request.headers.get("x-device-id")?.trim() ||
            request.nextUrl.searchParams.get("deviceId")?.trim();
        const deviceToken = request.headers.get("x-device-token")?.trim();

        if (!plateNo) {
            return NextResponse.json(
                { message: "plateNo is required" },
                { status: 400 }
            );
        }

        const params = new URLSearchParams({ plateNo });
        if (deviceId) params.set("deviceId", deviceId);

        const response = await fetch(
            `${baseUrl}/api/v1/client/transaction?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    ...(deviceId ? { "x-device-id": deviceId } : {}),
                    ...(deviceToken ? { "x-device-token": deviceToken } : {}),
                },
                cache: "no-store",
            }
        );

        return NextResponse.json(await response.json().catch(() => null), {
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Unable to connect to the carpark API",
                reason: error instanceof Error ? error.message : "network_error",
            },
            { status: 502 }
        );
    }
}
