"use client";

import { FaCar } from "react-icons/fa6";
import { RiLoopRightFill } from "react-icons/ri";
import { useTranslations } from "next-intl";

type PreloadPopupProps = {
  statusText?: string;
  title?: string;
  progress?: number;
};

function PreloadPopup({
  statusText,
  title,
  progress = 0,
}: PreloadPopupProps) {
  const t = useTranslations("PreloadPopup");
  const safeProgress = Math.max(0, Math.min(progress, 100));

  return (
    <div className="plate-popup__preload">
      <div className="plate-popup__preload-status">
        <span className="plate-popup__preload-status-dot" />
        <span>{statusText ?? t("processing")}</span>
      </div>

      <div className="plate-popup__preload-body">
        <div className="plate-popup__preload-card">
          <div className="plate-popup__preload-visual">
            <div className="plate-popup__preload-ring plate-popup__preload-ring--outer" />
            <div className="plate-popup__preload-ring plate-popup__preload-ring--inner" />
            <div className="plate-popup__preload-core-disc" />

            <div className="plate-popup__preload-orbit">
              <div className="plate-popup__preload-orbit-rotator">
                <div className="plate-popup__preload-car-badge">
                  <div className="plate-popup__preload-car-badge-inner">
                    <FaCar className="plate-popup__preload-car-icon" />
                  </div>
                </div>
              </div>
            </div>

            <div className="plate-popup__preload-center-core">
              <RiLoopRightFill className="plate-popup__preload-loop-icon" />
            </div>
          </div>

          <h2 className="plate-popup__preload-title">{title ?? t("loadingData")}</h2>
          <p className="plate-popup__preload-subtext">{t("pleaseWait")}</p>
        </div>

        <div className="plate-popup__preload-progress-track">
          <div
            className="plate-popup__preload-progress-fill"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default PreloadPopup;