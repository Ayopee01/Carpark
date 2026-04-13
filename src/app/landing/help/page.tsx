"use client";

import { FiPhoneCall } from "react-icons/fi";
import { useTranslations } from "next-intl";
import BackBtn from "@/src/app/components/BackBtn";
import "@/src/app/css/Help.css";

function Help() {
  const t = useTranslations("Help");

  return (
    <section className="help-page">
      <div className="help-page__back">
        <BackBtn />
      </div>

      <div className="help-page__content">
        <div className="help-page__hero">
          <h1 className="help-page__title">{t("title")}</h1>
          <h3 className="help-page__subtitle">{t("subtitle")}</h3>
          <p className="help-page__desc">
            {t("descLine1")}
            <br />
            {t("descLine2")}
          </p>
        </div>

        <div className="help-page__contact-title">{t("contactTitle")}</div>

        <a href="tel:+66123123456" className="help-card">
          <span className="help-card__icon">
            <FiPhoneCall />
          </span>

          <span className="help-card__text">
            <strong>+66-123xxxxxx</strong>
            <small>{t("contactStaff")}</small>
          </span>
        </a>
      </div>
    </section>
  );
}

export default Help;