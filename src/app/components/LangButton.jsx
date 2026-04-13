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
function LangButton({ variant = "side" }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const wrapRef = useRef(null);

  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("SideMenu");

  // ------------------------------- useEffect -------------------------------
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

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

  const handleSelectLanguage = (nextLocale) => {
    if (nextLocale === locale) {
      setOpen(false);
      return;
    }

    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);

    startTransition(() => {
      router.refresh();
    });
  };

  const buttonClassName = variant === "nav" ? "langButton" : "langButton_side";
  const wrapClassName =
    variant === "nav"
      ? "langDropdown langDropdown--nav"
      : "langDropdown langDropdown--side";

  // ----------------------------------- UI -----------------------------------
  return (
    <div className={wrapClassName} ref={wrapRef}>
      <button
        type="button"
        className={buttonClassName}
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