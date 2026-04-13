"use client";

import { useRouter } from "next/navigation";
// Import Libraries
import { useTranslations } from "next-intl";
// CSS
import "../css/BackBtn.css";
// Icons
import { FiChevronLeft } from "react-icons/fi";

// ------------------------------- Function -------------------------------
function BackBtn() {
  const router = useRouter();
  const t = useTranslations("Common");

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  // ----------------------------------- UI -----------------------------------
  return (
    <section>
      <button type="button" className="back-btn" onClick={handleBack}>
        <FiChevronLeft />
        <span>{t("back")}</span>
      </button>
    </section>
  );
}

export default BackBtn;