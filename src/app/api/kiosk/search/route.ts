import { NextRequest, NextResponse } from "next/server";
import http from "node:http";
import https from "node:https";

export const runtime = "nodejs";

function getBaseUrl() {
    return process.env.BaseURL ?? process.env.BASE_URL ?? "";
}

function getWithBody(url: string, body: object) {
    return new Promise<{ status: number; data: unknown }>((resolve, reject) => {
        const payload = JSON.stringify(body);
        const target = new URL(url);
        const client = target.protocol === "https:" ? https : http;

        const req = client.request(
            {
                protocol: target.protocol,
                hostname: target.hostname,
                port: target.port,
                path: target.pathname,
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(payload),
                },
            },
            (res) => {
                let raw = "";

                res.on("data", (chunk) => {
                    raw += chunk;
                });

                res.on("end", () => {
                    resolve({
                        status: res.statusCode ?? 500,
                        data: raw ? JSON.parse(raw) : null,
                    });
                });
            }
        );

        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

export async function GET(request: NextRequest) {
    try {
        const baseUrl = getBaseUrl();

        if (!baseUrl) {
            return NextResponse.json(
                { message: "BaseURL is not configured" },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(request.url);
        const plateNo = searchParams.get("plateNo")?.trim();

        if (!plateNo) {
            return NextResponse.json(
                { message: "plateNo is required" },
                { status: 400 }
            );
        }

        const { status, data } = await getWithBody(
            `${baseUrl}/api/v1/kiosk/search`,
            { plateNo }
        );

        return NextResponse.json(data, { status });
    } catch (error) {
        return NextResponse.json(
            {
                message: "Failed to search kiosk plate",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}