"use client";

import { useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
// Import Libraries
import { useTranslations } from "next-intl";
// Components
import BackBtn from "@/src/app/components/BackBtn";
import PlateKeyboard, { fetchPlateWithProgress, plateKeyboardRows } from "@/src/app/components/PlateKeyboard";
import PlateNotFoundPopup from "@/src/app/components/PlateNotFoundPopup";
import PreloadPopup from "@/src/app/components/PreloadPopup";
// CSS
import "@/src/app/css/Search.css";

// ------------------------------- Config -------------------------------
const SEARCH_API_PATH = "/api/mockdata";
const PRELOAD_DELAY_MS = 1200;

const STORAGE_KEYS = {
  searchedPlate: "searchedPlate",
  plateDetailData: "plateDetailData",
} as const;

// ------------------------------- Function Helpers -------------------------------
const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ------------------------------- Component -------------------------------
function SearchPage() {
  const router = useRouter();
  const t = useTranslations("Search");

  const [progress, setProgress] = useState(0);
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);

  // ------------------------------- State Helpers -------------------------------
  const clearError = () => {
    setError("");
  };

  const resetSearchState = () => {
    clearError();
    setShowNotFoundPopup(false);
    setProgress(0);
  };

  const completeLoading = async () => {
    setProgress(100);
    await wait(PRELOAD_DELAY_MS);
  };

  const updatePlate = (value: string | ((prev: string) => string)) => {
    if (loading) return;

    setPlate((prev) =>
      typeof value === "function" ? value(prev) : value
    );

    clearError();
  };

  const saveSearchResult = (plateNumber: string, data: unknown) => {
    sessionStorage.setItem(STORAGE_KEYS.searchedPlate, plateNumber);
    sessionStorage.setItem(STORAGE_KEYS.plateDetailData, JSON.stringify(data));
  };

  // ------------------------------- Input Handlers -------------------------------
  const handleMobileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    updatePlate(event.target.value);
  };

  const handleMobileInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleConfirm();
    }
  };

  const handleKeyClick = (key: string) => {
    updatePlate((prev) => `${prev}${key}`);
  };

  const handleDelete = () => {
    updatePlate((prev) => prev.slice(0, -1));
  };

  // ------------------------------- Search Handler -------------------------------
  const handleConfirm = async () => {
    const trimmedPlate = plate.trim();

    if (!trimmedPlate) {
      setError(t("errorRequired"));
      return;
    }

    setLoading(true);
    resetSearchState();

    try {
      const { status, result } = await fetchPlateWithProgress(
        `${SEARCH_API_PATH}?plate=${encodeURIComponent(trimmedPlate)}`,
        setProgress
      );

      if (!result) {
        setError(t("errorInvalidData"));
        await completeLoading();
        return;
      }

      if (status === 404) {
        await completeLoading();
        setShowNotFoundPopup(true);
        return;
      }

      if (!result.ok) {
        setError(result.message || t("errorSearchFailed"));
        await completeLoading();
        return;
      }

      saveSearchResult(trimmedPlate, result.data);

      await completeLoading();
      router.push(`/landing/detail?plate=${encodeURIComponent(trimmedPlate)}`);
    } catch (error) {
      console.error("Unexpected search error:", error);
      setError(t("errorUnexpected"));
    } finally {
      setLoading(false);
    }
  };

  const confirmText = loading ? t("loadingButton") : t("confirm");

  // ----------------------------------- UI -----------------------------------
  return (
    <>
      <section className="search-page">
        <div className="search-page__content">
          <div className="search-page__back">
            <BackBtn />
          </div>

          <div className="search-page__header">
            <h1>Smart Carpark</h1>
            <p>{t("subtitle")}</p>
          </div>

          <div className="search-page__hint">
            <div className="plate-card">
              <span className="plate-card__label">{t("plateLabel")}</span>

              {/* Input Mobile */}
              <input
                type="text"
                className={`plate-card__input plate-card__input--mobile ${plate ? "is-filled" : ""}`}
                value={plate}
                onChange={handleMobileInputChange}
                onKeyDown={handleMobileInputKeyDown}
                placeholder={t("platePlaceholder")}
                aria-label={t("plateLabel")}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="search"
                disabled={loading}
              />

              {/* Input Desktop */}
              <input
                type="text"
                className={`plate-card__input plate-card__input--desktop ${plate ? "is-filled" : ""} is-readonly`}
                value={plate}
                placeholder={t("platePlaceholder")}
                aria-label={t("plateLabel")}
                readOnly
              />
            </div>

            <p>{t("subtitle")}</p>

            {error ? <p className="search-page__error">{error}</p> : null}
          </div>

          <PlateKeyboard
            rows={plateKeyboardRows}
            loading={loading}
            confirmText={confirmText}
            onKeyClick={handleKeyClick}
            onDelete={handleDelete}
            onConfirm={handleConfirm}
          />
        </div>
      </section>

      {loading ? (
        <div className="plate-popup__overlay">
          <div className="plate-popup">
            <div className="plate-popup__top">
              <PreloadPopup
                statusText={t("processing")}
                title={t("loadingData")}
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