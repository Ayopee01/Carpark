"use client";

import { useEffect } from "react";
import { CiCircleQuestion } from "react-icons/ci";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LangButton from "./LangButton";
import "../css/SideMenu.css";

function SideMenu({ open, onClose }) {
    const t = useTranslations("SideMenu");

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

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