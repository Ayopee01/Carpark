"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// Import Libraries
import { useLocale, useTranslations } from "next-intl";
// CSS
import "@/src/app/css/LangButton.css";
// Icons
import { FiChevronDown } from "react-icons/fi";

// ------------------------------- Function -------------------------------

// Function แสดงปุ่มเลือกภาษา รูปแบบ Dropdown
function LangButton({ variant = "side" }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const wrapRef = useRef(null);

  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("SideMenu");

  // useEffect สำหรับปิด Dropdown เมื่อคลิกนอกพื้นที่หรือกดปุ่ม Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    // Function ปิด Dropdown เมื่อกดปุ่ม Escape
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Function สำหรับจัดการการเลือก Language และ Refresh หน้า
  const handleSelectLanguage = (nextLocale) => {
    if (nextLocale === locale) {
      setOpen(false);
      return;
    }

    // Set cookie สำหรับเก็บ locale ที่เลือก และกำหนด path และ samesite
    document.cookie = `locale=${nextLocale}; path=/; samesite=lax`;
    setOpen(false);

    // Refresh หน้าเพื่อให้แสดงผลตาม locale ที่เลือก
    startTransition(() => {
      router.refresh();
    });
  };

  // ----------------------------------- UI -----------------------------------
  return (
    <div
      className={
        variant === "nav"
          ? "langDropdown langDropdown--nav"
          : "langDropdown langDropdown--side"
      }
      ref={wrapRef}
    >
      <button
        type="button"
        className={variant === "nav" ? "langButton" : "langButton_side"}
        onClick={() => setOpen((prev) => !prev)}
        disabled={isPending}
      >
        <span>{isPending ? "..." : locale.toUpperCase()}</span>
        <FiChevronDown className={open ? "rotate" : ""} />
      </button>

      {open && (
        <div className="langDropdownMenu">
          <button
            type="button"
            className={`langDropdownItem ${locale === "th" ? "active" : ""}`}
            onClick={() => handleSelectLanguage("th")}
            disabled={isPending}
          >
            TH - {t("thai")}
          </button>

          <button
            type="button"
            className={`langDropdownItem ${locale === "en" ? "active" : ""}`}
            onClick={() => handleSelectLanguage("en")}
            disabled={isPending}
          >
            EN - {t("english")}
          </button>

          <button
            type="button"
            className={`langDropdownItem ${locale === "zh" ? "active" : ""}`}
            onClick={() => handleSelectLanguage("zh")}
            disabled={isPending}
          >
            ZH - {t("chinese")}
          </button>
        </div>
      )}
    </div>
  );
}

export default LangButton;
