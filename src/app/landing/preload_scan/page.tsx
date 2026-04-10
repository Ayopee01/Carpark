"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "@/src/app/css/Preload.css";

type LoadState = "loading" | "success" | "error";

async function fetchWithProgress<T>(
    url: string,
    onProgress: (percent: number | null) => void,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(url, {
        ...init,
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    if (!response.body) {
        onProgress(null);
        return response.json();
    }

    const totalHeader = response.headers.get("content-length");
    const totalBytes = totalHeader ? Number(totalHeader) : 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let receivedBytes = 0;
    let resultText = "";

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (value) {
            receivedBytes += value.length;
            resultText += decoder.decode(value, { stream: true });

            if (totalBytes > 0) {
                const percent = Math.min(
                    100,
                    Math.round((receivedBytes / totalBytes) * 100)
                );
                onProgress(percent);
            } else {
                onProgress(null);
            }
        }
    }

    resultText += decoder.decode();

    if (totalBytes > 0) {
        onProgress(100);
    }

    return JSON.parse(resultText) as T;
}

function PreloadPage() {
    const router = useRouter();
    const [progress, setProgress] = useState<number | null>(0);
    const [status, setStatus] = useState<LoadState>("loading");
    const [message, setMessage] = useState("กำลังโหลดข้อมูล...");
    const [dotCount, setDotCount] = useState(1);

    useEffect(() => {
        const dotTimer = window.setInterval(() => {
            setDotCount((prev) => (prev >= 4 ? 1 : prev + 1));
        }, 350);

        return () => window.clearInterval(dotTimer);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                setStatus("loading");
                setMessage("กำลังโหลดข้อมูล...");

                const data = await fetchWithProgress(
                    "/api/dashboard",
                    (percent) => {
                        if (!isMounted) return;
                        setProgress(percent);
                    },
                    {
                        headers: {
                            Accept: "application/json",
                        },
                    }
                );

                console.log("loaded:", data);

                if (!isMounted) return;

                setProgress(100);
                setStatus("success");
                setMessage("โหลดสำเร็จ");

                window.setTimeout(() => {
                    router.push("/dashboard");
                }, 500);
            } catch (error) {
                console.error(error);

                if (!isMounted) return;

                setStatus("error");
                setMessage("โหลดข้อมูลไม่สำเร็จ");
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [router]);

    const dots = useMemo(() => ".".repeat(dotCount), [dotCount]);

    return (
        <section className="preload-page">
            <div className="preload-page__content">
                <div className="preload-logo">P</div>

                <h1 className="preload-title">Smart Carpark</h1>

                <div
                    className={`preload-bar ${progress === null ? "preload-bar--indeterminate" : ""
                        }`}
                    aria-label="loading progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress ?? undefined}
                    role="progressbar"
                >
                    <div
                        className="preload-bar__fill"
                        style={{
                            width: progress === null ? "45%" : `${progress}%`,
                        }}
                    />
                </div>

                <div className="preload-text-wrap">
                    {status === "loading" ? (
                        <>
                            <p className="preload-dots">{dots}</p>
                            <p className="preload-message">
                                {progress === null ? "กำลังโหลดข้อมูลจาก API" : `${progress}%`}
                            </p>
                        </>
                    ) : (
                        <p
                            className={`preload-message ${status === "error" ? "is-error" : "is-success"
                                }`}
                        >
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

export default PreloadPage;