"use client";

import Link from "next/link";
// Import Libraries
import { useTranslations } from "next-intl";
// CSS
import "@/src/app/css/Dashboard.css";
// Icons
import { TbScan } from "react-icons/tb";
import { MdOutlineImageSearch } from "react-icons/md";

// ------------------------------- Function -------------------------------
function Dashboard() {
  const t = useTranslations("Dashboard");

  // ----------------------------------- UI -----------------------------------
  return (
    <section className="dashboard">
      <div className="container-dashboard">
        <header className="header-dashboard">
          <h1>Smart Carpark</h1>
          <h3>{t("welcome")}</h3>
          <p>{t("description")}</p>
        </header>

        <div className="card-dashboard">
          <Link className="scan-btn" href="/landing/scan">
            <TbScan />
            <h2>{t("scanTitle")}</h2>
            <p>{t("scanSubtitle")}</p>
          </Link>

          <Link className="img-btn" href="/landing/search">
            <MdOutlineImageSearch />
            <h2>{t("searchTitle")}</h2>
            <p>{t("searchSubtitle")}</p>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;