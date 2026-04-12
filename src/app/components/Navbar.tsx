"use client"

import { useState } from "react";
// icons
import { FiChevronDown } from "react-icons/fi";
import { HiMenuAlt2, HiMenu } from "react-icons/hi";
import { CiCircleQuestion } from "react-icons/ci";
// import css
import "../css/Navbar.css";
import Link from "next/link";
import SideMenu from "./SideMenu";

// -------------------------- UI --------------------------
function Navbar() {
  
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <nav className="navbar">
        <div className="inner">
          <div className="content-left">
            <div className="logoBox">P</div>
            {/* Logo */}
            <div className="brandText">
              <h1 className="title">Smart Carpark</h1>
              <p className="subtitle">ลูกค้า - Customer</p>
            </div>
          </div>
          {/* Menu */}
          <div className="content-right">
            {/* Button Language */}
            <button
              type="button"
              className="langButton">
              <span>TH</span>
              <FiChevronDown />
            </button>
            {/* Button Help */}
            <div>
              <Link
                className="helpButton"
                href="/landing/help">
                <CiCircleQuestion />
                ช่วยเหลือ
              </Link>
            </div>
          </div>
          {/* Hamburger */}
          <button
            type="button"
            className={`hamburger ${isOpen ? "active" : ""}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="hamburger__icon">
              {isOpen ? <HiMenuAlt2 /> : <HiMenu />}
            </span>
          </button>
        </div>
      </nav>
      {/* Sidebar */}
      <SideMenu open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default Navbar