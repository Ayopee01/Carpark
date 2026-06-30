"use client";

// Import Libraries
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// Lib
import { getActivatedDeviceType } from "@/src/app/lib/device";
import { BARRIER_RETURN_STORAGE_KEY } from "@/src/app/lib/storageKeys";

// ------------------------------- Config -------------------------------

// Route หลักและ Storage key ที่ใช้ควบคุมสิทธิ์ของ Kiosk และ Barrier Gate
const BARRIER_PATH = "/landing/barrier-gate";
const BARRIER_PAYMENT_PATH = "/landing/check-payment";
const KIOSK_HOME_PATH = "/landing/dashboard";
const MOBILE_HOME_PATH = "/landing/search";
const SHARED_PATHS = new Set([
    "/landing/activate",
    "/landing/maintenance",
]);
const MOBILE_PATHS = new Set([
    "/landing/search",
    "/landing/detail",
    "/landing/check-payment",
]);

// ------------------------------- Helpers -------------------------------

// ตรวจสอบว่า pathname อยู่ในกลุ่ม Route ของ Barrier Gate หรือไม่
function isBarrierPath(pathname: string) {
    return pathname === BARRIER_PATH || pathname.startsWith(`${BARRIER_PATH}/`);
}

// ตรวจสอบว่า pathname อยู่ภายใต้ /landing หรือไม่
function isLandingPath(pathname: string) {
    return pathname === "/landing" || pathname.startsWith("/landing/");
}

function isMobilePath(pathname: string) {
    return MOBILE_PATHS.has(pathname);
}

// ------------------------------- Function -------------------------------

// ควบคุมการเข้าถึง Route ให้ตรงกับประเภทอุปกรณ์ที่ถูก Activate
export default function DeviceRouteGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    // ------------------------------- useEffect -------------------------------

    // ตรวจสอบสิทธิ์ทุกครั้งที่ Route หรือ query parameter เปลี่ยน
    useEffect(() => {
        const deviceType = getActivatedDeviceType();

        // อนุญาตให้ Barrier Gate เข้า Detail ชั่วคราวจาก flow PAYMENT_REQUIRED
        const isBarrierPayment =
            pathname === BARRIER_PAYMENT_PATH &&
            Boolean(searchParams.get("plateNo")) &&
            Boolean(sessionStorage.getItem(BARRIER_RETURN_STORAGE_KEY));

        // Mobile/Public, Route นอก /landing และ Route ส่วนกลางไม่ต้องจำกัดสิทธิ์
        if (!isLandingPath(pathname) || SHARED_PATHS.has(pathname)) {
            return;
        }

        if (!deviceType) {
            if (!isMobilePath(pathname)) {
                router.replace(MOBILE_HOME_PATH);
            }
            return;
        }

        // ป้องกัน Kiosk เข้า Route ของ Barrier Gate
        if (deviceType === "kiosk" && isBarrierPath(pathname)) {
            router.replace(KIOSK_HOME_PATH);
            return;
        }

        // จำกัด Barrier Gate ให้อยู่หน้า Barrier หรือ Detail สำหรับชำระเงิน
        if (
            deviceType === "barrier-gate" &&
            !isBarrierPath(pathname) &&
            !isBarrierPayment
        ) {
            router.replace(BARRIER_PATH);
        }
    }, [pathname, router, searchParams]);

    // ----------------------------------- UI -----------------------------------
    return <>{children}</>;
}
