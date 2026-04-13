"use client";

import { useRouter } from "next/navigation";
import { FiChevronLeft } from "react-icons/fi";
import { useTranslations } from "next-intl";
import "../css/BackBtn.css";

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