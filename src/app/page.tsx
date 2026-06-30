"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
      return;
    }

    router.replace("/landing/search");
  }, [router]);

  return null;
}

export default Page;
