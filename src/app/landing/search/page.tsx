"use client";

import {
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import BackBtn from "@/src/app/components/BackBtn";
import PlateCandidatePopup from "@/src/app/components/PlateCandidatePopup";
import PlateKeyboard, {
  plateKeyboardRows,
} from "@/src/app/components/PlateKeyboard";
import PlateNotFoundPopup from "@/src/app/components/PlateNotFoundPopup";
import PreloadPopup from "@/src/app/components/PreloadPopup";
import {
  MIN_PLATE_NO_LENGTH,
  isValidPlateNo,
  normalizePlateNo,
} from "@/src/app/lib/plate";
import {
  getDeviceAuthHeaders,
  getDeviceId,
  handleDeviceResponseStatus,
} from "@/src/app/lib/device";
import {
  isAlreadyProcessedTransactionError,
  isMultipleTransactionResponse,
  isSelectableTransactionCandidate,
} from "@/src/app/lib/transactionStatus";
import { savePlateTransactionResult } from "@/src/app/lib/transactionStorage";
import type {
  ClientTransactionCandidate,
  ClientTransactionResponse,
  ClientTransactionSearchResponse,
} from "@/src/app/type/client";

import "@/src/app/css/Search.css";

const SEARCH_API_PATH = "/api/client/transaction";

async function fetchKioskSearchWithProgress(
  plateNo: string,
  deviceId: string | null,
  onProgress: (value: number) => void
) {
  onProgress(15);

  try {
    onProgress(35);

    const searchParams = new URLSearchParams({ plateNo });

    if (deviceId) {
      searchParams.set("deviceId", deviceId);
    }

    const response = await fetch(`${SEARCH_API_PATH}?${searchParams.toString()}`, {
      method: "GET",
      headers: deviceId ? getDeviceAuthHeaders("kiosk") : {},
      cache: "no-store",
    });

    onProgress(92);

    const result = (await response.json().catch(() => null)) as
      | ClientTransactionSearchResponse
      | { message?: string; status?: string }
      | null;

    const wasRedirected = handleDeviceResponseStatus(
      response,
      result as { message?: string; status?: string } | null
    );

    onProgress(100);

    return {
      status: response.status,
      result,
      wasRedirected,
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
  const [isAlreadyProcessedError, setIsAlreadyProcessedError] = useState(false);
  const [showNotFoundPopup, setShowNotFoundPopup] = useState(false);
  const [candidatePlates, setCandidatePlates] = useState<ClientTransactionCandidate[]>([]);
  const [showCandidatePopup, setShowCandidatePopup] = useState(false);

  const clearError = () => {
    setError("");
    setIsAlreadyProcessedError(false);
  };

  const resetSearchState = () => {
    clearError();
    setShowNotFoundPopup(false);
    setShowCandidatePopup(false);
    setCandidatePlates([]);
    setProgress(0);
  };

  const completeLoading = () => {
    setProgress(100);
  };

  const updatePlate = (value: string | ((prev: string) => string)) => {
    if (loading) return;

    setPlate((prev) =>
      typeof value === "function" ? value(prev) : value
    );

    clearError();
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

  const searchPlate = async (plateValue: string) => {
    const trimmedPlate = normalizePlateNo(plateValue);

    if (!trimmedPlate) {
      setError(t("errorRequired"));
      return;
    }

    if (!isValidPlateNo(trimmedPlate)) {
      setError(t("errorPlateTooShort", { min: MIN_PLATE_NO_LENGTH }));
      return;
    }

    const deviceId = getDeviceId("kiosk")?.trim() || null;

    setLoading(true);
    resetSearchState();

    try {
      const { status, result, wasRedirected } = await fetchKioskSearchWithProgress(
        trimmedPlate,
        deviceId,
        setProgress
      );

      if (wasRedirected) return;

      if (status === 404) {
        completeLoading();
        setShowNotFoundPopup(true);
        return;
      }

      if (result && isMultipleTransactionResponse(result)) {
        const selectableCandidates = result.candidates.filter(
          isSelectableTransactionCandidate
        );

        if (selectableCandidates.length === 0) {
          setIsAlreadyProcessedError(true);
          setError(t("errorAlreadyProcessed"));
          completeLoading();
          return;
        }

        if (selectableCandidates.length === 1) {
          setPlate(selectableCandidates[0].plateNo);
          await searchPlate(selectableCandidates[0].plateNo);
          return;
        }

        setCandidatePlates(selectableCandidates);
        setShowCandidatePopup(true);
        completeLoading();
        return;
      }

      if (status >= 400) {
        const isAlreadyProcessed = isAlreadyProcessedTransactionError(status, result);

        setIsAlreadyProcessedError(isAlreadyProcessed);
        setError(
          isAlreadyProcessed
            ? t("errorAlreadyProcessed")
            : t("errorSearchFailed")
        );
        completeLoading();
        return;
      }

      if (!result) {
        setError(t("errorInvalidData"));
        completeLoading();
        return;
      }

      savePlateTransactionResult(trimmedPlate, result as ClientTransactionResponse);

      completeLoading();

      router.push(`/landing/detail?plateNo=${encodeURIComponent(trimmedPlate)}`);
    } catch (error) {
      console.error("Unexpected search error:", error);
      setError(t("errorUnexpected"));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    await searchPlate(plate);
  };

  const handleSelectCandidate = (plateNo: string) => {
    setPlate(plateNo);
    setShowCandidatePopup(false);
    setCandidatePlates([]);
    void searchPlate(plateNo);
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

            <p
              className={
                error
                  ? `search-page__error ${isAlreadyProcessedError ? "search-page__error--processed" : ""}`
                  : "search-page__subtitle"
              }
            >
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
        <PreloadPopup
          statusText={t("processing")}
          title={t("loadingData")}
          progress={progress}
        />
      ) : null}

      <PlateNotFoundPopup
        open={showNotFoundPopup}
        onClose={() => setShowNotFoundPopup(false)}
        onRetry={() => setShowNotFoundPopup(false)}
      />

      <PlateCandidatePopup
        open={showCandidatePopup}
        candidates={candidatePlates}
        onClose={() => setShowCandidatePopup(false)}
        onSelect={handleSelectCandidate}
      />
    </>
  );
}

export default SearchPage;
