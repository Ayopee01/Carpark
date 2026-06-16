"use client";

import { useEffect } from "react";
import { startHeartbeat } from "@/src/app/lib/heartbeat";
import type { UiDeviceType } from "@/src/app/lib/device";

const HEARTBEAT_INTERVAL_MS = 45000;

export default function HeartbeatProvider({
    type,
    children,
}: {
    type: UiDeviceType;
    children: React.ReactNode;
}) {
    useEffect(() => {
        const timer = startHeartbeat(type, HEARTBEAT_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [type]);

    return <>{children}</>;
}
