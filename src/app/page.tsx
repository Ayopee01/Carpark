"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Components
import Activate from "./landing/activate/page";
import { getActivatedDeviceType } from "@/src/app/lib/device";

// ----------------------------------- UI -----------------------------------
function Page() {
  const router = useRouter();

  useEffect(() => {
    const deviceType = getActivatedDeviceType();

    if (deviceType === "kiosk") {
      router.replace("/landing/dashboard");
      return;
    }

    if (deviceType === "barrier-gate") {
      router.replace("/landing/barrier-gate");
    }
  }, [router]);

  return <Activate />;
}

export default Page
