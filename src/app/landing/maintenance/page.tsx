"use client";

// Import Libraries
import { useTranslations } from "next-intl";

// ------------------------------- Function -------------------------------

export default function MaintenancePage() {
    const t = useTranslations("Maintenance");

    // ----------------------------------- UI -----------------------------------
    return (
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <h1>{t("title")}</h1>
            <p>{t("description")}</p>
        </main>
    );
}
