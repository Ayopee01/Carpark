import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Config Ping สำหรับ SSE 25 วินาที
const PING_INTERVAL_MS = 25000;

// Function สร้างข้อความ ping สำหรับ SSE (Server-Sent Events)
function createSsePing() {
    return `data: ${JSON.stringify({
        type: "ping",
        at: new Date().toISOString(),
    })}\n\n`;
}

// API Route สำหรับ Connect กับ Client Event Stream
export async function GET(request: NextRequest) {
    const baseUrl = process.env.BASE_URL ?? "";

    if (!baseUrl) {
        return new Response("API base URL is not configured", {
            status: 500,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    }

    // ดึงค่า deviceId, deviceToken, gateId และ direction จาก headers หรือ query parameters
    const deviceId =
        request.headers.get("x-device-id")?.trim() ||
        request.nextUrl.searchParams.get("deviceId")?.trim();
    const deviceToken =
        request.headers.get("x-device-token")?.trim() ||
        request.nextUrl.searchParams.get("deviceToken")?.trim();
    const gateId = request.nextUrl.searchParams.get("gateId")?.trim();
    const direction = request.nextUrl.searchParams.get("direction")?.trim();
    const cameraId = request.nextUrl.searchParams.get("cameraId")?.trim();

    // ตรวจสอบว่า deviceId และ deviceToken ถูกส่งมาหรือไม่
    let upstream: Response;

    // เชื่อมต่อกับ upstream event stream ของ backend
    try {
        // สร้าง query parameters สำหรับ upstream request
        const params = new URLSearchParams();
        // ถ้า deviceId, gateId หรือ direction ถูกส่งมา ให้เพิ่มลงใน query parameters
        if (deviceId) params.set("deviceId", deviceId);
        if (gateId) params.set("gateId", gateId);
        if (direction) params.set("direction", direction);
        if (cameraId) params.set("cameraId", cameraId);

        // GET Request ไปยัง backend เพื่อเชื่อมต่อกับ event stream
        upstream = await fetch(`${baseUrl}/api/v1/client/events?${params}`, {
            method: "GET",
            headers: {
                Accept: "text/event-stream",
                ...(deviceId ? { "x-device-id": deviceId } : {}),
                ...(deviceToken ? { "x-device-token": deviceToken } : {}),
            },
            cache: "no-store",
            signal: request.signal,
        });

    // จับข้อผิดพลาดที่เกิดขึ้นระหว่างการเชื่อมต่อกับ upstream
    } catch (error) {
        return new Response(
            error instanceof Error
                ? error.message
                : "Cannot connect to client event stream",
            {
                status: 502,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                },
            }
        );
    }

    // ตรวจสอบว่า upstream response เป็น OK และมี body หรือไม่
    if (!upstream.ok || !upstream.body) {
        return new Response("Cannot connect to client event stream", {
            status: upstream.status || 500,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    }

    // สร้าง ReadableStream สำหรับส่งข้อมูล SSE กลับไปยัง client
    const encoder = new TextEncoder();
    // อ่านข้อมูลจาก upstream stream
    const reader = upstream.body.getReader();

    // สร้าง ReadableStream สำหรับส่งข้อมูล SSE กลับไปยัง client
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            let closed = false;
            let pingTimer: ReturnType<typeof setInterval> | null = null;

            const close = () => {
                if (closed) return;
                closed = true;

                if (pingTimer) {
                    clearInterval(pingTimer);
                }

                try {
                    controller.close();
                } catch {

                }
            };

            // ตั้งค่า ping timer เพื่อส่งข้อความ ping ตามค่า Config "PING_INTERVAL_MS"
            pingTimer = setInterval(() => {
                if (closed) return;
                controller.enqueue(encoder.encode(createSsePing()));
            }, PING_INTERVAL_MS);

            // เมื่อ client ปิดการเชื่อมต่อ ให้ยกเลิก upstream reader และปิด stream
            request.signal.addEventListener("abort", () => {
                void reader.cancel().catch(() => undefined);
                close();
            });

            // ส่งข้อความ ping ครั้งแรกทันทีหลังจากเชื่อมต่อ
            controller.enqueue(encoder.encode(createSsePing()));

            // อ่านข้อมูลจาก upstream stream และส่งต่อไปยัง client
            void (async () => {
                try {
                    while (!closed) {
                        const { done, value } = await reader.read();

                        if (closed) return;

                        if (done) {
                            close();
                            return;
                        }

                        if (value) {
                            controller.enqueue(value);
                        }
                    }
                } catch {
                    close();
                } finally {
                    reader.releaseLock();
                }
            })();
        },
        cancel() {
            void reader.cancel().catch(() => undefined);
        },
    });

    // ส่งข้อมูล SSE กลับไปยัง client
    return new Response(stream, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
