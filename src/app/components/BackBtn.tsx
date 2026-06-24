"use client";

import { useRouter } from "next/navigation";
// Import Libraries
import { useTranslations } from "next-intl";
// CSS
import "../css/BackBtn.css";
// Icons
import { FiChevronLeft } from "react-icons/fi";

// ------------------------------- Function -------------------------------

// Function แสดงปุ่ม Back Button
function BackBtn() {
  const router = useRouter();
  const t = useTranslations("Common");

  // Function ย้อนกลับใน window.history ถ้ามากกว่า 1
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      // หากไม่มีให้กลับไป page แรก
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