"use client";

import { useTranslations } from "next-intl";

export default function MaintenancePage() {
    const t = useTranslations("Maintenance");

    return (
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <h1>{t("title")}</h1>
            <p>{t("description")}</p>
        </main>
    );
}
