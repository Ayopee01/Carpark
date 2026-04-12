"use client";

import { useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import { CiCircleQuestion } from "react-icons/ci";
import Link from "next/link";
import "../css/SideMenu.css";

function SideMenu({ open, onClose }) {

    // Close on ESC
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    // lock scroll
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
            {/* overlay */}
            <div
                className={`overlay ${open ? "show" : ""}`}
                onClick={onClose}
            />

            {/* sidebar */}
            <aside className={`sidebar ${open ? "open" : ""}`}>
                <div className="sidebar-content">

                    <button className="langButton">
                        <span>TH</span>
                        <FiChevronDown />
                    </button>

                    <Link
                        className="helpButton"
                        href="/landing/help"
                        onClick={onClose}
                    >
                        <CiCircleQuestion />
                        ช่วยเหลือ
                    </Link>

                </div>
            </aside>
        </>
    );
}

export default SideMenu;