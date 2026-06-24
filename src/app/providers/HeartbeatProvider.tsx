"use client";

// Import Libraries
import { useEffect } from "react";
// Lib
import { startHeartbeat } from "@/src/app/lib/heartbeat";

// ------------------------------- Function -------------------------------

// เริ่มและหยุด Heartbeat ตามอายุการทำงานของ Application
export default function HeartbeatProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // ------------------------------- useEffect -------------------------------

    // ส่ง Check-in ทันทีและส่งซ้ำตามช่วงเวลาที่กำหนดใน heartbeat.ts
    useEffect(() => {
        const timer = startHeartbeat();

        // หยุด Interval เมื่อ Provider ถูกถอดออกจากหน้า
        return () => clearInterval(timer);
    }, []);

    // ----------------------------------- UI -----------------------------------
    return <>{children}</>;
}
