"use client";

import { useEffect, useRef, useState } from "react";
import type { Annotation } from "./types";

// OpenSeadragon فقط در مرورگر بارگذاری می‌شود (به window نیاز دارد)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OSDViewer = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OSDModule = any;

let modPromise: Promise<OSDModule> | null = null;
export function loadOsd(): Promise<OSDModule> {
  modPromise ??= import("openseadragon").then((m) => (m as { default?: OSDModule }).default ?? m);
  return modPromise;
}

/**
 * ساخت و نگهداری یک نمایشگر روی عنصر مشخص.
 * هر تغییر دید (زوم، جابه‌جایی، چرخش، تغییر اندازه) شمارنده‌ی tick را جلو می‌برد
 * تا لایه‌ی نشانه‌گذاری با تصویر هم‌گام بماند.
 */
export function useOsd(dzi: string | null) {
  const el = useRef<HTMLDivElement>(null);
  const viewer = useRef<OSDViewer>(null);
  const osd = useRef<OSDModule>(null);
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(0);
  const latestDzi = useRef(dzi);
  latestDzi.current = dzi;

  useEffect(() => {
    let alive = true;
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!alive || !viewer.current) return;
        setTick((t) => t + 1);
        const item = viewer.current.world.getItemAt(0);
        if (item) setZoom(item.viewportToImageZoom(viewer.current.viewport.getZoom(true)));
      });
    };
    loadOsd().then((OSD) => {
      if (!alive || !el.current) return;
      osd.current = OSD;
      const v = OSD({
        element: el.current,
        prefixUrl: "",
        drawer: "canvas",
        showNavigationControl: false,
        showNavigator: true,
        navigatorPosition: "BOTTOM_LEFT",
        navigatorSizeRatio: 0.17,
        navigatorAutoFade: false,
        navigatorBackground: "#000",
        navigatorBorderColor: "rgba(255,255,255,.25)",
        navigatorDisplayRegionColor: "#ffe066",
        animationTime: 0.55,
        springStiffness: 9,
        blendTime: 0.08,
        visibilityRatio: 0.5,
        minZoomImageRatio: 0.7,
        maxZoomPixelRatio: 2.5,
        constrainDuringPan: false,
        immediateRender: false,
        gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, flickEnabled: true },
        gestureSettingsTouch: { pinchRotate: false, flickEnabled: true },
        preserveViewport: false,
        timeout: 60000,
      });
      viewer.current = v;
      for (const e of ["animation", "update-viewport", "resize", "rotate", "open"]) v.addHandler(e, bump);
      v.addHandler("open", () => { setReady(true); setFailed(false); });
      v.addHandler("open-failed", () => { setFailed(true); setReady(false); });
      if (latestDzi.current) v.open(latestDzi.current);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      viewer.current?.destroy();
      viewer.current = null;
    };
    // نمایشگر فقط یک‌بار ساخته می‌شود؛ تعویض تصویر در effect بعدی
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = viewer.current;
    if (!v || !dzi) return;
    setReady(false);
    v.open(dzi);
  }, [dzi]);

  return { el, viewer, osd, tick, ready, failed, zoom };
}

// ─── تبدیل مختصات ─────────────────────────────────────────────────────────

export type Pt = { x: number; y: number };

export function imageToScreen(viewer: OSDViewer, OSD: OSDModule, x: number, y: number): Pt | null {
  const item = viewer?.world?.getItemAt(0);
  if (!item || !OSD) return null;
  const p = item.imageToViewerElementCoordinates(new OSD.Point(x, y));
  return { x: p.x, y: p.y };
}

export function screenToImage(viewer: OSDViewer, OSD: OSDModule, x: number, y: number): Pt | null {
  const item = viewer?.world?.getItemAt(0);
  if (!item || !OSD) return null;
  const p = item.viewerElementToImageCoordinates(new OSD.Point(x, y));
  return { x: p.x, y: p.y };
}

/** شکل‌ها در مختصات صفحه برای رسم SVG */
export function shapeGeometry(viewer: OSDViewer, OSD: OSDModule, a: Pick<Annotation, "shape" | "x1" | "y1" | "x2" | "y2">) {
  const p1 = imageToScreen(viewer, OSD, a.x1, a.y1);
  const p2 = imageToScreen(viewer, OSD, a.x2, a.y2);
  if (!p1 || !p2) return null;
  if (a.shape === "ARROW") {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const head = Math.min(18, len * 0.45);
    const w = head * 0.55;
    const bx = p2.x - ux * head;
    const by = p2.y - uy * head;
    return {
      kind: "arrow" as const,
      line: { x1: p1.x, y1: p1.y, x2: bx, y2: by },
      head: `${p2.x},${p2.y} ${bx - uy * w},${by + ux * w} ${bx + uy * w},${by - ux * w}`,
      label: { x: p1.x, y: p1.y + (dy > 0 ? -10 : 22) },
    };
  }
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const w = Math.abs(p2.x - p1.x);
  const h = Math.abs(p2.y - p1.y);
  return {
    kind: a.shape === "ELLIPSE" ? ("ellipse" as const) : ("rect" as const),
    box: { x, y, w, h },
    label: { x: x + w / 2, y: y - 8 },
  };
}
