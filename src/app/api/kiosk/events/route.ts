import { NextRequest } from "next/server";
import { getBackendBaseUrl } from "@/src/app/lib/serverApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PING_INTERVAL_MS = 25000;

function createSsePing() {
    return `data: ${JSON.stringify({
        type: "ping",
        at: new Date().toISOString(),
    })}\n\n`;
}

export async function GET(request: NextRequest) {
    const baseUrl = getBackendBaseUrl();

    if (!baseUrl) {
        return new Response("Missing BaseURL or BASE_URL", {
            status: 500,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    }

    const deviceId =
        request.headers.get("x-device-id")?.trim() ||
        request.nextUrl.searchParams.get("deviceId")?.trim();
    const deviceToken =
        request.headers.get("x-device-token")?.trim() ||
        request.nextUrl.searchParams.get("deviceToken")?.trim();

    let upstream: Response;

    try {
        const params = new URLSearchParams();
        if (deviceId) params.set("deviceId", deviceId);

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
    } catch (err) {
        return new Response(
            err instanceof Error ? err.message : "Cannot connect to kiosk event stream",
            {
                status: 502,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                },
            }
        );
    }

    if (!upstream.ok || !upstream.body) {
        return new Response("Cannot connect to kiosk event stream", {
            status: upstream.status || 500,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    }

    const encoder = new TextEncoder();
    const reader = upstream.body.getReader();

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
                    // The client may have already gone away.
                }
            };

            pingTimer = setInterval(() => {
                if (closed) return;
                controller.enqueue(encoder.encode(createSsePing()));
            }, PING_INTERVAL_MS);

            request.signal.addEventListener("abort", () => {
                void reader.cancel().catch(() => undefined);
                close();
            });

            controller.enqueue(encoder.encode(createSsePing()));

            void (async () => {
                try {
                    while (!closed) {
                        const { done, value } = await reader.read();

                        if (closed) {
                            return;
                        }

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
                    void reader.releaseLock();
                }
            })();
        },
        cancel() {
            void reader.cancel().catch(() => undefined);
        },
    });

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
