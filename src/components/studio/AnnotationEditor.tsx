"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveAnnotations, type StudioMedia } from "@/actions/studio";
import { Icon, type IconName } from "../Icon";
import { AnnotationLayer } from "../viewer/AnnotationLayer";
import { screenToImage, useOsd } from "../viewer/osd";
import type { Annotation, Shape } from "../viewer/types";
import { useI18n } from "../LocaleProvider";

type Tool = "PAN" | Shape;
const TOOLS: { id: Tool; icon: IconName; label: string }[] = [
  { id: "PAN", icon: "hand", label: "جابه‌جایی و زوم" },
  { id: "ARROW", icon: "arrowTool", label: "پیکان" },
  { id: "ELLIPSE", icon: "ellipse", label: "بیضی" },
  { id: "RECT", icon: "rect", label: "کادر" },
];
const SHAPE_FA: Record<Shape, string> = { ARROW: "پیکان", ELLIPSE: "بیضی", RECT: "کادر" };

/** ویرایشگر نشانه‌گذاری: روی تصویر پیکان/بیضی/کادر بکشید و برچسب بزنید */
export function AnnotationEditor({ media, onClose }: { media: StudioMedia; onClose: (changed: boolean) => void }) {
  const { el, viewer, osd, tick, ready } = useOsd(media.dzi);
  const [items, setItems] = useState<Annotation[]>(media.annotations);
  const [tool, setTool] = useState<Tool>("ARROW");
  const [sel, setSel] = useState<number | null>(null);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const { t, f } = useI18n();
  const stage = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLInputElement | null)[]>([]);

  // در حالت رسم، ماوس فقط شکل می‌کشد و تصویر جابه‌جا نمی‌شود
  useEffect(() => {
    viewer.current?.setMouseNavEnabled(tool === "PAN");
  }, [tool, viewer, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel !== null) remove(sel);
      if (e.key === "Escape") { setDraft(null); setSel(null); }
      const k = { v: "PAN", h: "PAN", a: "ARROW", e: "ELLIPSE", r: "RECT" }[e.key.toLowerCase()] as Tool | undefined;
      if (k) setTool(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toImage = (e: React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect();
    return screenToImage(viewer.current, osd.current, e.clientX - r.left, e.clientY - r.top);
  };

  function remove(i: number) {
    setItems((a) => a.filter((_, j) => j !== i));
    setSel(null);
    setDirty(true);
  }

  function update(i: number, patch: Partial<Annotation>) {
    setItems((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setDirty(true);
  }

  const drawing = tool !== "PAN";
  const all = draft ? [...items, draft] : items;

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={t("نشانه‌گذاری تصویر")}>
      <div className="modal wide">
        <div className="modal-head">
          <h2>{t("نشانه‌گذاری تصویر")}</h2>
          <span className="muted en" style={{ fontSize: 13 }}>{[media.stain, media.magnification].filter(Boolean).join(" · ")}</span>
          <span className="spacer" />
          {err && <span style={{ color: "var(--danger)", fontSize: 13 }}>{err}</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => (!dirty || confirm(t("تغییرات ذخیره نشده‌اند. خارج می‌شوید؟"))) && onClose(false)}>{t("انصراف")}</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const r = await saveAnnotations(media.id, items.map(({ shape, x1, y1, x2, y2, label, spoiler }) => ({ shape, x1, y1, x2, y2, label, spoiler })));
                if (!r.ok) setErr(r.error);
                else onClose(true);
              })
            }
          >
            {pending ? t("در حال ذخیره…") : t("ذخیره")}
          </button>
        </div>
        <div className="modal-body annot-editor">
          <div className="viewer">
            <div className="viewer-stage" ref={stage} style={{ height: "min(70vh, 640px)" }}>
              <div ref={el} className="viewer-osd" />
              {ready && (
                <AnnotationLayer
                  viewer={viewer.current}
                  osd={osd.current}
                  items={all}
                  tick={tick}
                  selected={sel}
                  onSelect={tool === "PAN" ? (i) => { setSel(i); labelRefs.current[i]?.focus(); } : undefined}
                  drawing={drawing}
                  svgProps={{
                    onPointerDown: (e) => {
                      if (!drawing) return;
                      const p = toImage(e);
                      if (!p) return;
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                      setSel(null);
                      setDraft({ shape: tool as Shape, x1: p.x, y1: p.y, x2: p.x, y2: p.y, label: "", spoiler: false });
                    },
                    onPointerMove: (e) => {
                      if (!draft) return;
                      const p = toImage(e);
                      if (p) setDraft({ ...draft, x2: p.x, y2: p.y });
                    },
                    onPointerUp: () => {
                      if (!draft) return;
                      const size = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1);
                      const minSize = (media.width ?? 1000) * 0.004;
                      if (size > minSize) {
                        const i = items.length;
                        setItems([...items, draft]);
                        setSel(i);
                        setDirty(true);
                        setTimeout(() => labelRefs.current[i]?.focus(), 30);
                      }
                      setDraft(null);
                    },
                  }}
                />
              )}
              {!ready && <div className="viewer-loading">{t("در حال بارگذاری…")}</div>}
              <div className="viewer-float" role="toolbar" aria-label={t("ابزار رسم")}>
                {TOOLS.map((x) => (
                  <button key={x.id} className="viewer-btn" aria-pressed={tool === x.id} title={t(x.label)} onClick={() => setTool(x.id)}>
                    <Icon name={x.icon} />
                  </button>
                ))}
              </div>
            </div>
            <div className="viewer-bar">
              <span className="info">
                {tool === "PAN" ? t("جابه‌جا کنید و زوم کنید؛ برای انتخاب، روی شکل کلیک کنید.") : t("برای کشیدن {shape}، روی تصویر بکشید. پیکان از نقطه‌ی شروع به سمت هدف کشیده می‌شود.", { shape: t(SHAPE_FA[tool]) })}
              </span>
            </div>
          </div>

          <div className="stack gap-12">
            <div className="alert alert-info" style={{ fontSize: 13 }}>
              <Icon name="info" />
              <span>{t("نشانه‌هایی را که پاسخ را آشکار می‌کنند (مانند برچسبی حاوی نام موجودیت) علامت بزنید؛ این نشانه‌ها فقط پس از پاسخ خواننده نمایش داده می‌شوند.")}</span>
            </div>
            {items.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>{t("هنوز نشانه‌ای اضافه نشده است.")}</p>
            ) : (
              <div className="annot-list">
                {items.map((a, i) => (
                  <div key={i} className={`annot-row${sel === i ? " selected" : ""}`} onClick={() => setSel(i)}>
                    <span className="badge" style={{ paddingInline: 6 }}>{f.digits(i + 1)}</span>
                    <input
                      ref={(r) => { labelRefs.current[i] = r; }}
                      className="input"
                      style={{ minHeight: 34, padding: "4px 8px", fontSize: 13.5 }}
                      placeholder={t("برچسب {shape}", { shape: t(SHAPE_FA[a.shape]) })}
                      value={a.label}
                      maxLength={120}
                      dir="auto"
                      onChange={(e) => update(i, { label: e.target.value })}
                    />
                    <label className="check" title={t("فقط پس از پاسخ نمایش داده شود")} style={{ fontSize: 12, alignItems: "center", gap: 4 }}>
                      <input type="checkbox" checked={a.spoiler} onChange={(e) => update(i, { spoiler: e.target.checked })} style={{ marginTop: 0 }} />
                      {t("آشکارکننده‌ی پاسخ")}
                    </label>
                    <button className="btn btn-ghost btn-icon btn-sm" aria-label={t("حذف")} onClick={(e) => { e.stopPropagation(); remove(i); }}><Icon name="trash" /></button>
                  </div>
                ))}
              </div>
            )}
            <p className="muted" style={{ fontSize: 12.5 }}>{t("میانبرها: V جابه‌جایی · A پیکان · E بیضی · R کادر · Delete حذف")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
