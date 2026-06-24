"use client";

import { useEffect } from "react";
import Link from "next/link";
// Import Libraries
import { useTranslations } from "next-intl";
// Components
import LangButton from "./LangButton";
// CSS
import "../css/SideMenu.css";
// Icons
import { CiCircleQuestion } from "react-icons/ci";

// ------------------------------- Function -------------------------------

// Function แสดง Side Menu สำหรับ Mobile View
function SideMenu({ open, onClose }) {
    const t = useTranslations("SideMenu");

    // ------------------------------- useEffect -------------------------------

    // ปิด Side Menu เมื่อกดปุ่ม Escape
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    // ปิด Scroll เมื่อเปิด Side Menu
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    // ----------------------------------- UI -----------------------------------
    return (
        <>
            <div
                className={`overlay ${open ? "show" : ""}`}
                onClick={onClose}
            />

            <aside className={`sidebar ${open ? "open" : ""}`}>
                <div className="sidebar-content">
                    <LangButton />

                    <Link
                        className="helpButton_side"
                        href="/landing/help"
                        onClick={onClose}
                    >
                        <CiCircleQuestion />
                        {t("help")}
                    </Link>
                </div>
            </aside>
        </>
    );
}

export default SideMenu;
