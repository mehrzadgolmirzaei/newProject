"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { AnnotationLayer } from "./AnnotationLayer";
import { useOsd } from "./osd";
import type { ViewerMedia } from "./types";
import { useI18n } from "../LocaleProvider";

/** نمایشگر اسلاید صفحه‌ی مورد: زوم عمیق، نوار تصاویر، نشانه‌ها، تمام‌صفحه */
export function SlideViewer({ media }: { media: ViewerMedia[] }) {
  const [index, setIndex] = useState(0);
  const { t, f, locale } = useI18n();
  const [showAnn, setShowAnn] = useState(true);
  const [full, setFull] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = media[index];
  const { el, viewer, osd, tick, ready, failed, zoom } = useOsd(current?.kind !== "VIDEO" ? current?.dzi ?? null : null);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // میانبرهای صفحه‌کلید: ← → تصویر بعد/قبل، A نشانه‌ها، F تمام‌صفحه
  const go = useCallback((d: number) => setIndex((i) => (i + d + media.length) % media.length), [media.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      if (!box.current?.matches(":hover") && document.fullscreenElement !== box.current) return;
      const fwd = locale === "en" ? "ArrowRight" : "ArrowLeft";
      const back = locale === "en" ? "ArrowLeft" : "ArrowRight";
      if (e.key === fwd && media.length > 1) go(1);
      else if (e.key === back && media.length > 1) go(-1);
      else if (e.key.toLowerCase() === "a") setShowAnn((s) => !s);
      else if (e.key.toLowerCase() === "f") toggleFull();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else box.current?.requestFullscreen?.();
  }

  if (!current) {
    return (
      <div className="viewer">
        <div className="viewer-stage"><div className="viewer-loading">{t("تصویری برای این مورد ثبت نشده است.")}</div></div>
      </div>
    );
  }

  const isVideo = current.kind === "VIDEO";
  const hasAnn = current.annotations.length > 0;
  const zoomLabel = zoom ? (zoom >= 1 ? `${f.digits(zoom.toFixed(1))}×` : f.percent(Math.round(zoom * 100), 100)) : "";

  return (
    <div className="viewer" ref={box}>
      <div className="viewer-stage">
        <div ref={el} className="viewer-osd" style={{ visibility: isVideo ? "hidden" : "visible" }} />
        {isVideo && current.video && (
          <video key={current.id} src={current.video} controls playsInline preload="metadata" style={{ position: "absolute", inset: 0 }} />
        )}
        {!isVideo && showAnn && hasAnn && ready && (
          <AnnotationLayer viewer={viewer.current} osd={osd.current} items={current.annotations} tick={tick} />
        )}
        {!isVideo && !ready && !failed && <div className="viewer-loading">{t("در حال بارگذاری تصویر…")}</div>}
        {failed && <div className="viewer-loading">{t("بارگذاری تصویر ناموفق بود.")}</div>}

        {(current.stain || current.magnification || current.caption) && (
          <div className="viewer-caption">
            {(current.stain || current.magnification) && (
              <b className="en">{[current.stain, current.magnification].filter(Boolean).join(" · ")}</b>
            )}
            {current.caption && <span>{current.caption}</span>}
          </div>
        )}

        {!isVideo && (
          <div className="viewer-float" role="toolbar" aria-label={t("ابزار نمایشگر")}>
            <button className="viewer-btn" onClick={() => viewer.current?.viewport.zoomBy(1.6)} title={t("بزرگ‌نمایی (+)")}><Icon name="zoomIn" /></button>
            <button className="viewer-btn" onClick={() => viewer.current?.viewport.zoomBy(1 / 1.6)} title={t("کوچک‌نمایی (−)")}><Icon name="zoomOut" /></button>
            <button className="viewer-btn" onClick={() => viewer.current?.viewport.goHome()} title={t("نمای کامل (0)")}><Icon name="home" /></button>
            <button
              className="viewer-btn"
              onClick={() => viewer.current?.viewport.setRotation((viewer.current.viewport.getRotation() + 90) % 360)}
              title={t("چرخش ۹۰ درجه")}
            >
              <Icon name="rotate" />
            </button>
          </div>
        )}
        {!isVideo && ready && zoomLabel && <div className="viewer-zoom" title={t("بزرگ‌نمایی نسبت به پیکسل‌های تصویر")}>{zoomLabel}</div>}
      </div>

      <div className="viewer-bar">
        {media.length > 1 && (
          <>
            <button className="viewer-btn" onClick={() => go(-1)} title={t("تصویر قبل")}><Icon name="chevronRight" /></button>
            <span className="info"><b>{f.digits(index + 1)}</b> {t("از")} {f.digits(media.length)}</span>
            <button className="viewer-btn" onClick={() => go(1)} title={t("تصویر بعد")}><Icon name="chevronLeft" /></button>
          </>
        )}
        <span className="info" style={{ marginInlineStart: 6 }}>
          {current.kind === "WSI" && <span>{t("اسلاید کامل")}</span>}
          {current.width && current.height && <span className="en">{current.width.toLocaleString()} × {current.height.toLocaleString()} px</span>}
        </span>
        <span className="spacer" />
        {hasAnn && !isVideo && (
          <button className="viewer-btn" aria-pressed={showAnn} onClick={() => setShowAnn((s) => !s)} title={t("نمایش/پنهان نشانه‌ها (A)")}>
            <Icon name={showAnn ? "eye" : "eyeOff"} />
          </button>
        )}
        <button className="viewer-btn" onClick={toggleFull} title={t("تمام‌صفحه (F)")} aria-pressed={full}><Icon name="expand" /></button>
      </div>

      {media.length > 1 && (
        <div className="filmstrip" role="tablist" aria-label={t("تصاویر مورد")}>
          {media.map((m, i) => (
            <button key={m.id} className="film" role="tab" aria-selected={i === index} aria-current={i === index} onClick={() => setIndex(i)} title={m.caption || m.stain}>
              {m.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumb} alt="" loading="lazy" />
              ) : (
                <div style={{ aspectRatio: "4/3", display: "grid", placeItems: "center", color: "#888" }}><Icon name={m.kind === "VIDEO" ? "video" : "image"} size={22} /></div>
              )}
              {(m.stain || m.magnification) && <span>{[m.stain, m.magnification].filter(Boolean).join(" ")}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
