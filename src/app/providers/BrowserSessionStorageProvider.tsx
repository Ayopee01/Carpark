"use client";

import { ensureFreshActivationForBrowserSession } from "@/src/app/lib/device";

export default function BrowserSessionStorageProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    ensureFreshActivationForBrowserSession();

    return <>{children}</>;
}
