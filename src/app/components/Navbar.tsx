"use client"

// icons
import { FiChevronDown } from "react-icons/fi";
import { CiCircleQuestion } from "react-icons/ci";
// import css
import "../css/Navbar.css";
import Link from "next/link";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="inner">
        <div className="content-left">
          <div className="logoBox">P</div>

          <div className="brandText">
            <h1 className="title">Smart Carpark</h1>
            <p className="subtitle">ลูกค้า - Customer</p>
          </div>
        </div>

        <div className="content-right">
          <button type="button" className="langButton">
            <span>TH</span>
            <FiChevronDown />
          </button>

          <div>
            <Link className="helpButton" href="/landing/help"><CiCircleQuestion />ช่วยเหลือ</Link>
          </div>

        </div>
      </div>
    </nav>
  );
}

export default Navbar