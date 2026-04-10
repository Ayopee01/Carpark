"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiPhoneCall } from "react-icons/fi";
import { FaCheck } from "react-icons/fa";
import BackBtn from "@/src/app/components/BackBtn";
import PaymentPopup from "@/src/app/components/PaymentPopup";
import "@/src/app/css/Detail.css";

type DetailData = {
    plate: string;
    province: string;
    date: string;
    entryTime: string;
    duration: string;
    paymentStatus: string;
    amount: number;
    paymentMethod: string;
};

function DetailPage() {
    const searchParams = useSearchParams();
    const plate = searchParams.get("plate") ?? "";

    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [data, setData] = useState<DetailData | null>(null);
    const [fetchError, setFetchError] = useState("");
    const [resolvedPlate, setResolvedPlate] = useState("");

    useEffect(() => {
        if (!plate) return;

        let cancelled = false;

        const loadData = async () => {
            try {
                const res = await fetch(
                    `/api/mockdata?plate=${encodeURIComponent(plate)}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                const result = await res.json();

                if (cancelled) return;

                if (!res.ok || !result.ok) {
                    setResolvedPlate(plate);
                    setData(null);
                    setFetchError("ไม่พบข้อมูลทะเบียนนี้");
                    return;
                }

                setResolvedPlate(plate);
                setData(result.data);
                setFetchError("");
            } catch {
                if (cancelled) return;

                setResolvedPlate(plate);
                setData(null);
                setFetchError("โหลดข้อมูลไม่สำเร็จ");
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, [plate]);

    const currentData = resolvedPlate === plate ? data : null;
    const error = !plate
        ? "ไม่พบเลขทะเบียน"
        : resolvedPlate === plate
            ? fetchError
            : "";

    const plateValue = currentData?.plate || plate || "-";

    return (
        <>
            <section className="detail-page">
                <div className="detail-page__back">
                    <BackBtn />
                </div>

                <div className="detail-page__content">
                    <header className="detail-page__header">
                        <h1>ค้นหาเลขทะเบียน</h1>
                        <p>รายละเอียดเพิ่มเติม</p>
                    </header>

                    <div className="detail-plate-card">
                        <span className="detail-plate-card__label">เลขทะเบียน :</span>

                        <div className="detail-plate-card__input">
                            <span className="detail-plate-card__value">{plateValue}</span>

                            <span
                                className="detail-plate-card__edit detail-plate-card__edit--done"
                                aria-hidden="true"
                            >
                                <FaCheck />
                            </span>
                        </div>
                    </div>

                    <div className="detail-section-title">รายละเอียดเพิ่มเติม</div>

                    {error ? <div className="detail-error">{error}</div> : null}

                    <div className="detail-info-grid">
                        <div className="detail-info-card">
                            <span className="detail-info-card__label">วัน/เดือน/ปี :</span>
                            <strong>{currentData?.date || "-"}</strong>
                        </div>

                        <div className="detail-info-card">
                            <span className="detail-info-card__label">เวลาเข้า :</span>
                            <strong>{currentData?.entryTime || "-"}</strong>
                        </div>

                        <div className="detail-info-card">
                            <span className="detail-info-card__label">เวลาที่ใช้บริการ :</span>
                            <strong>{currentData?.duration || "-"}</strong>
                        </div>

                        <div className="detail-info-card detail-info-card--fee">
                            <div className="detail-info-card__fee-left">
                                <span className="detail-info-card__label">
                                    สถานะการชำระค่าบริการ :
                                </span>
                                <strong className="detail-info-card__danger">
                                    {currentData?.paymentStatus || "-"}
                                </strong>
                            </div>

                            <div className="detail-fee-box">
                                <span>ค่าบริการ</span>
                                <strong>
                                    {currentData?.amount != null ? `${currentData.amount} บาท` : "-"}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="payment-panel">
                        <h2>ช่องทางการชำระค่าบริการ</h2>

                        <p className="payment-panel__note">
                            ***เมื่อชำระค่าบริการเรียบร้อยแล้วจะต้องออกจากที่จอดรถภายในเวลา 15 นาที***
                        </p>

                        <div className="payment-card">
                            <div className="payment-card__top">
                                <div className="payment-card__logo">PROMPTPAY</div>

                                <div className="payment-card__tag">
                                    <span>FAST &amp; SECURE</span>
                                    <i />
                                </div>
                            </div>

                            <div className="payment-card__body">
                                <h3>{currentData?.paymentMethod || "-"}</h3>
                                <p>ค้นหาทะเบียนรถ</p>
                            </div>

                            <button
                                type="button"
                                className="payment-card__button"
                                onClick={() => setIsPopupOpen(true)}
                                disabled={!currentData}
                            >
                                ดำเนินการต่อ
                            </button>
                        </div>

                        <div className="payment-panel__help">
                            <span>มีปัญหาในการชำระเงิน?</span>

                            <a href="tel:+66123123456">
                                <FiPhoneCall />
                                <span>ติดต่อเจ้าหน้าที่</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <PaymentPopup
                open={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                amount={currentData?.amount ?? 0}
            />
        </>
    );
}

export default DetailPage;