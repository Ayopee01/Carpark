"use client";

import { useState } from "react";
import { FiDelete } from "react-icons/fi";
import { useRouter } from "next/navigation";
import BackBtn from "@/src/app/components/BackBtn";
import PlateNotFoundPopup from "@/src/app/components/PlateNotFoundPopup";
import PreloadPopup from "@/src/app/components/PreloadPopup";
import type { KeyboardItem, PlateSearchResponse } from "@/src/app/type/search";
import "@/src/app/css/Search.css";

type FetchPlateWithProgressResult = {
  status: number;
  result: PlateSearchResponse | null;
};

const keyboardRows: KeyboardItem[][] = [
  [
    { type: "key", value: "1" },
    { type: "key", value: "6" },
    { type: "key", value: "ก" },
    { type: "key", value: "ข" },
    { type: "key", value: "ค" },
    { type: "key", value: "ง" },
    { type: "key", value: "จ" },
    { type: "key", value: "ฉ" },
    { type: "key", value: "ช" },
    { type: "key", value: "ซ" },
    { type: "key", value: "ญ" },
  ],
  [
    { type: "key", value: "2" },
    { type: "key", value: "7" },
    { type: "key", value: "ฎ" },
    { type: "key", value: "ฏ" },
    { type: "key", value: "ฐ" },
    { type: "key", value: "ณ" },
    { type: "key", value: "ด" },
    { type: "key", value: "ต" },
    { type: "key", value: "ถ" },
    { type: "key", value: "ท" },
    { type: "key", value: "ธ" },
  ],
  [
    { type: "key", value: "3" },
    { type: "key", value: "8" },
    { type: "key", value: "น" },
    { type: "key", value: "บ" },
    { type: "key", value: "ป" },
    { type: "key", value: "ผ" },
    { type: "key", value: "ฝ" },
    { type: "key", value: "พ" },
    { type: "key", value: "ฟ" },
    { type: "key", value: "ภ" },
    { type: "key", value: "ม" },
  ],
  [
    { type: "key", value: "4" },
    { type: "key", value: "9" },
    { type: "key", value: "ย" },
    { type: "key", value: "ร" },
    { type: "key", value: "ล" },
    { type: "key", value: "ว" },
    { type: "key", value: "ศ" },
    { type: "key", value: "ษ" },
    { type: "key", value: "ส" },
    { type: "delete" },
  ],
  [
    { type: "key", value: "5" },
    { type: "key", value: "0" },
    { type: "key", value: "ห" },
    { type: "key", value: "อ" },
    { type: "key", value: "ฮ" },
    { type: "confirm", label: "confirm" },
  ],
];

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchPlateWithProgress(
  url: string,
  onProgress: (value: number) => void
): Promise<FetchPlateWithProgressResult> {
  onProgress(0);

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.body) {
    const result = (await res.json().catch(() => null)) as PlateSearchResponse | null;
    onProgress(100);

    return {
      status: res.status,
      result,
    };
  }

  const total = Number(res.headers.get("content-length") ?? 0);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let received = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;
    if (!value) continue;

    received += value.byteLength;
    text += decoder.decode(value, { stream: true });

    if (total > 0) {
      const percent = Math.round((received / total) * 100);
      onProgress(Math.min(percent, 100));
    }
  }

  text += decoder.decode();

  let result: PlateSearchResponse | null = null;

  try {
    result = text ? (JSON.parse(text) as PlateSearchResponse) : null;
  } catch {
    result = null;
  }

  onProgress(100);

  return {
    status: res.status,
    result,
  };
}

function SearchPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);

  const handleKeyClick = (key: string) => {
    if (loading) return;
    setPlate((prev) => `${prev}${key}`);
    setError("");
  };

  const handleDelete = () => {
    if (loading) return;
    setPlate((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleConfirm = async () => {
    const trimmedPlate = plate.trim();

    if (!trimmedPlate) {
      setError("กรุณากรอกเลขทะเบียนรถ");
      return;
    }

    setLoading(true);
    setProgress(0);
    setError("");
    setShowNotFoundPopup(false);

    try {
      const { status, result } = await fetchPlateWithProgress(
        `/api/mockdata?plate=${encodeURIComponent(trimmedPlate)}`,
        setProgress
      );

      if (!result) {
        setError("รูปแบบข้อมูลไม่ถูกต้อง");
        setProgress(100);
        await wait(120);
        return;
      }

      if (status === 404) {
        setProgress(100);
        await wait(120);
        setShowNotFoundPopup(true);
        return;
      }

      if (!result.ok) {
        setError(result.message || "ค้นหาข้อมูลไม่สำเร็จ");
        setProgress(100);
        await wait(120);
        return;
      }

      sessionStorage.setItem("searchedPlate", trimmedPlate);
      sessionStorage.setItem("plateDetailData", JSON.stringify(result.data));

      setProgress(100);
      await wait(120);

      router.push(`/landing/detail?plate=${encodeURIComponent(trimmedPlate)}`);
    } catch (err: unknown) {
      console.error("unexpected search error:", err);
      setError("เกิดข้อผิดพลาดบางอย่าง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="search-page">
        <div className="search-page__content">
          <div className="search-page__back">
            <BackBtn />
          </div>

          <div className="search-page__header">
            <h1>Smart Carpark</h1>
            <p>กรอกข้อมูลเลขทะเบียนรถของคุณ</p>
          </div>

          <div className="search-page__hint">
            <div className="plate-card">
              <span className="plate-card__label">ระบุเลขทะเบียนรถ</span>
              <div className={`plate-card__display ${plate ? "is-filled" : ""}`}>
                {plate || "1กข 1234"}
              </div>
            </div>
            <p>กรุณากรอกข้อมูลเลขทะเบียนรถของคุณ</p>

            {error ? <p className="search-page__error">{error}</p> : null}
          </div>

          <div className="plate-keyboard-container">
            <div className="plate-keyboard">
              {keyboardRows.map((row, rowIndex) =>
                row.map((item, itemIndex) => {
                  if (item.type === "key") {
                    return (
                      <button
                        key={`${rowIndex}-${itemIndex}-${item.value}`}
                        type="button"
                        className="plate-keyboard__key"
                        onClick={() => handleKeyClick(item.value)}
                        disabled={loading}
                      >
                        {item.value}
                      </button>
                    );
                  }

                  if (item.type === "delete") {
                    return (
                      <button
                        key={`${rowIndex}-${itemIndex}-delete`}
                        type="button"
                        className="plate-keyboard__action plate-keyboard__action--delete"
                        onClick={handleDelete}
                        aria-label="ลบ"
                        disabled={loading}
                      >
                        <FiDelete />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={`${rowIndex}-${itemIndex}-confirm`}
                      type="button"
                      className="plate-keyboard__action plate-keyboard__action--confirm"
                      onClick={handleConfirm}
                      disabled={loading}
                    >
                      {loading ? "loading..." : item.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="plate-popup__overlay">
          <div className="plate-popup">
            <div className="plate-popup__top">
              <PreloadPopup
                statusText="กำลังประมวลผล"
                title="กำลังโหลดข้อมูล..."
                progress={progress}
              />
            </div>
          </div>
        </div>
      ) : null}

      <PlateNotFoundPopup
        open={showNotFoundPopup}
        onClose={() => setShowNotFoundPopup(false)}
        onRetry={() => setShowNotFoundPopup(false)}
      />
    </>
  );
}

export default SearchPage;