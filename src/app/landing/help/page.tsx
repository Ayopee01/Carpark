"use client";

// icons
import { FiPhoneCall } from "react-icons/fi";
// import component
import BackBtn from "@/src/app/components/BackBtn";
// import css
import "@/src/app/css/Help.css";

function Help() {
  return (
    <section className="help-page">
      <div className="help-page__back">
        <BackBtn />
      </div>

      <div className="help-page__content">
        <div className="help-page__hero">
          <h1 className="help-page__title">Smart Carpark Support</h1>
          <h3 className="help-page__subtitle">Concierge</h3>
          <p className="help-page__desc">
            We’re here to ensure your parking experience
            <br />
            is as seamless as your drive.
          </p>
        </div>

        <div className="help-page__contact-title">Help/Contact Staff</div>

        <a href="tel:+66123123456" className="help-card">
          <span className="help-card__icon">
            <FiPhoneCall />
          </span>

          <span className="help-card__text">
            <strong>+66-123xxxxxx</strong>
            <small>ติดต่อเจ้าหน้าที่</small>
          </span>
        </a>
      </div>
    </section>
  );
}

export default Help;