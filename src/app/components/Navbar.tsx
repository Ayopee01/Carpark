"use client";

import { useState } from "react";
import Link from "next/link";
// Import Libraries
import { useTranslations } from "next-intl";
// Components
import SideMenu from "./SideMenu";
import LangButton from "./LangButton";
// CSS
import "../css/Navbar.css";
// Icons
import { HiMenuAlt2, HiMenu } from "react-icons/hi";
import { CiCircleQuestion } from "react-icons/ci";

// ------------------------------- Function -------------------------------
function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Navbar");

  // ----------------------------------- UI -----------------------------------
  return (
    <>
      <nav className="navbar">
        <div className="inner">
          <div className="content-left">
            <div className="logoBox">P</div>

            <div className="brandText">
              <h1 className="title">Smart Carpark</h1>
              <p className="subtitle">{t("customerSubtitle")}</p>
            </div>
          </div>

          <div className="content-right">
            <LangButton variant="nav" />

            <div>
              <Link className="helpButton" href="/landing/help">
                <CiCircleQuestion />
                {t("help")}
              </Link>
            </div>
          </div>

          <button
            type="button"
            className={`hamburger ${isOpen ? "active" : ""}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="hamburger__icon">
              {isOpen ? <HiMenuAlt2 /> : <HiMenu />}
            </span>
          </button>
        </div>
      </nav>

      <SideMenu open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default Navbar;