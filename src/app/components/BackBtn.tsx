"use client";

import { useRouter } from "next/navigation";
// icons
import { FiChevronLeft } from "react-icons/fi";
// import css
import "../css/BackBtn.css";

function BackBtn() {
  const router = useRouter();

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
        <FiChevronLeft className="back-btn__icon" />
        <span>ย้อนกลับ</span>
      </button>
    </section>
  );
}

export default BackBtn;