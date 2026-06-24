"use client";

import { useState } from "react";
import Link from "next/link";
// Import Libraries
import { useTranslations } from "next-intl";
// Providers
import { useKioskTheme } from "@/src/app/providers/KioskThemeRealtimeProvider";
// Components
import SideMenu from "./SideMenu";
import LangButton from "./LangButton";
// CSS
import "../css/Navbar.css";
// Icons
import { HiMenuAlt2, HiMenu } from "react-icons/hi";
import { CiCircleQuestion } from "react-icons/ci";

// ------------------------------- Function -------------------------------

// Function แสดง Navbar
function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [failedLogoSrc, setFailedLogoSrc] = useState<string | null>(null);
  const t = useTranslations("Navbar");

  // Fetch theme และ systemName จาก useKioskTheme
  const { theme, systemName, refreshTheme } = useKioskTheme();
  const logoSrc = theme?.logoUrl
    ? theme.updatedAt
      ? `${theme.logoUrl}${theme.logoUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(theme.updatedAt)}`
      : theme.logoUrl
    : null;
  const shouldShowLogo = Boolean(logoSrc && failedLogoSrc !== logoSrc);

  // ----------------------------------- UI -----------------------------------
  return (
    <>
      <nav className="navbar">
        <div className="inner">
          <div className="content-left">
            {shouldShowLogo && logoSrc ? (
              <img
                key={logoSrc}
                src={logoSrc}
                alt={systemName ?? "Logo"}
                className="navbarLogo"
                onError={() => {
                  setFailedLogoSrc(logoSrc);
                  void refreshTheme();
                }}
              />
            ) : null}

            {/* <div className="brandText">
              <h1 className="title">{systemName ?? "Smart Carpark Kiosk"}</h1>
            </div> */}
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
