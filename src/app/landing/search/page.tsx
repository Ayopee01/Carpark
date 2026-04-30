"use client";

import {
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import BackBtn from "@/src/app/components/BackBtn";
import PlateKeyboard, {
  plateKeyboardRows,
} from "@/src/app/components/PlateKeyboard";
import PlateNotFoundPopup from "@/src/app/components/PlateNotFoundPopup";
import PreloadPopup from "@/src/app/components/PreloadPopup";

import "@/src/app/css/Search.css";

const SEARCH_API_PATH = "/api/kiosk/search";
const PRELOAD_DELAY_MS = 0;

const STORAGE_KEYS = {
  searchedPlate: "searchedPlate",
  plateDetailData: "plateDetailData",
  plateSearchResponse: "plateSearchResponse",
} as const;

type KioskSearchItem = {
  id: string;
  billNo: string;
  plateNo: string;
  vehicleType: string;
  serviceType: string;
  entryAt: string;
  exitAt: string | null;
  calculatedAt: string;
  exitTimeLimit: string | null;
  isOverstay: boolean;
  status: string;
  baseAmount: number;
  netAmount: number;
  totalPaid: number;
  remainingAmount: number;
  serviceDisplay: string;
  durationHour: number;
  totalMinutes: number;
  payments: unknown[];
  qrData: string;
  createdAt: string;
  updatedAt: string;
};

type KioskSearchResponse = {
  success?: boolean;
  message?: string;
  items?: KioskSearchItem[];
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function getErrorMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return fallback;
}

async function fetchKioskSearchWithProgress(
  plateNo: string,
  onProgress: (value: number) => void
) {
  onProgress(15);

  try {
    onProgress(35);

    const searchParams = new URLSearchParams({
      plateNo,
    });

    const response = await fetch(`${SEARCH_API_PATH}?${searchParams.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    onProgress(92);

    const result = (await response.json().catch(() => null)) as
      | KioskSearchResponse
      | null;

    onProgress(100);

    return {
      status: response.status,
      result,
    };
  } catch (error) {
    onProgress(100);
    throw error;
  }
}

function SearchPage() {
  const router = useRouter();
  const t = useTranslations("Search");

  const [progress, setProgress] = useState(0);
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);

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

  const saveSearchResult = (
    plateNumber: string,
    response: KioskSearchResponse
  ) => {
    const firstItem = response.items?.[0] ?? null;

    sessionStorage.setItem(STORAGE_KEYS.searchedPlate, plateNumber);
    sessionStorage.setItem(
      STORAGE_KEYS.plateDetailData,
      JSON.stringify(firstItem)
    );
    sessionStorage.setItem(
      STORAGE_KEYS.plateSearchResponse,
      JSON.stringify(response)
    );
  };

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

  const handleConfirm = async () => {
    const trimmedPlate = plate.trim();

    if (!trimmedPlate) {
      setError(t("errorRequired"));
      return;
    }

    setLoading(true);
    resetSearchState();

    try {
      const { status, result } = await fetchKioskSearchWithProgress(
        trimmedPlate,
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

      if (status >= 400) {
        setError(getErrorMessage(result, t("errorSearchFailed")));
        await completeLoading();
        return;
      }

      if (!Array.isArray(result.items) || result.items.length === 0) {
        await completeLoading();
        setShowNotFoundPopup(true);
        return;
      }

      saveSearchResult(trimmedPlate, result);

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

  return (
    <>
      <section className="search-page">
        <div className="search-page__content">
          <div>
            <BackBtn />
          </div>

          <div className="search-page__header">
            <h1>Smart Carpark</h1>
            <p>{t("subtitle")}</p>
          </div>

          <div className="search-page__hint">
            <div className="plate-card">
              <span className="plate-card__label">
                {t("plateLabel")}
              </span>

              <input
                type="text"
                className={`plate-card__input plate-card__input--mobile ${plate ? "is-filled" : ""
                  }`}
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

              <input
                type="text"
                className={`plate-card__input plate-card__input--desktop ${plate ? "is-filled" : ""
                  } is-readonly`}
                value={plate}
                placeholder={t("platePlaceholder")}
                aria-label={t("plateLabel")}
                readOnly
              />
            </div>

            <p className={error ? "search-page__error" : "search-page__subtitle"}>
              {error || t("subtitle")}
            </p>
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