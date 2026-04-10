"use client"

// icons
import { TbScan } from "react-icons/tb";
import { MdOutlineImageSearch } from "react-icons/md";
// import css
import "@/src/app/css/Dashboard.css";
import Link from "next/link";

function Dashboard() {
  return (
    <section className="dashboard">
      <div className="container-dashboard">
        <header className="header-dashboard">
          <h1>Smart Carpark</h1>
          <h3>ยินดีต้อนรับ</h3>
          <p>ระบบ Kiosk สำหรับให้บริการชำระค่าจอดรถแบบครบวงจร ที่ช่วยให้ผู้ใช้สามารถค้นหาข้อมูล แสดงรายละเอียด และชำระเงินได้อย่างสะดวก รวดเร็ว และใช้งานง่าย</p>
        </header>

        <div className="card-dashboard">
          <Link className="scan-btn" href="/landing/scan">
            <TbScan />
            <h2>Scan Receipt QR</h2>
            <p>สแกน QR ใบเสร็จ</p>
          </Link>

          <Link className="img-btn" href="/landing/search">
            <MdOutlineImageSearch />
            <h2>Search License Plate</h2>
            <p>ค้นหาทะเบียนรถ</p>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Dashboard