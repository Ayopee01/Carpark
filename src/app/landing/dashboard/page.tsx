"use client";

import { TbScan } from "react-icons/tb";
import { MdOutlineImageSearch } from "react-icons/md";
import { useTranslations } from "next-intl";
import "@/src/app/css/Dashboard.css";
import Link from "next/link";

function Dashboard() {
  const t = useTranslations("Dashboard");

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