"use client";

import React from "react";
import { MdOutlineQrCodeScanner } from "react-icons/md";
import BackBtn from "@/src/app/components/BackBtn";
import "@/src/app/css/Scan.css";

function ScanPage() {
    return (
        <section className="scan-page">
            <div className="scan-page__back">
                <BackBtn />
            </div>

            <div className="scan-page__content">
                <div className="scan-page__header">
                    <h1>Smart Carpark</h1>
                    <p>สแกนเพื่อค้นหาเลขทะเบียน</p>
                </div>

                <div className="scan-page__divider" />

                <div className="scan-box">
                    <span className="scan-box__corner scan-box__corner--tl" />
                    <span className="scan-box__corner scan-box__corner--tr" />
                    <span className="scan-box__corner scan-box__corner--bl" />
                    <span className="scan-box__corner scan-box__corner--br" />

                    <div className="scan-box__line" />

                    <div className="scan-box__icon">
                        <MdOutlineQrCodeScanner />
                    </div>
                </div>

                <p className="scan-page__hint">
                    กรุณาจัดวางเลขทะเบียนรถ หรือคิวอาร์โค้ดให้อยู่
                    <br />
                    ภายในกรอบเพื่อทำการสแกน
                </p>
            </div>
        </section>
    );
}

export default ScanPage;