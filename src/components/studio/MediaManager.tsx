"use client";

import { useEffect, useRef, useState } from "react";
import { deleteMedia, listMedia, reorderMedia, retryMedia, updateMedia, type StudioMedia } from "@/actions/studio";
import { MAGNIFICATION_SUGGESTIONS, STAIN_SUGGESTIONS } from "@/lib/taxonomy";
import { faDigits } from "@/lib/text";
import { Icon } from "../Icon";
import { AnnotationEditor } from "./AnnotationEditor";

type Upload = { key: string; name: string; progress: number; error?: string };

export function MediaManager({
  caseId, initial, accept, maxMb, wsiEnabled, onChange,
}: { caseId: string; initial: StudioMedia[]; accept: string[]; maxMb: number; wsiEnabled: boolean; onChange: () => void }) {
  const [items, setItems] = useState(initial);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [annotating, setAnnotating] = useState<StudioMedia | null>(null);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setItems(await listMedia(caseId));
    onChange();
  };

  // تا وقتی تصویری در حال پردازش است، هر ۲.۵ ثانیه وضعیت را بپرس
  const processing = items.some((m) => m.status === "PROCESSING" || m.status === "UPLOADING");
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processing]);

  function uploadOne(file: File) {
    const ext = ("." + (file.name.split(".").pop() ?? "")).toLowerCase();
    const key = `${Date.now()}-${Math.random()}`;
    if (!accept.includes(ext)) {
      setErr(`نوع فایل «${ext}» پشتیبانی نمی‌شود.`);
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setErr(`حجم «${file.name}» بیش از ${faDigits(maxMb)} مگابایت است.`);
      return;
    }
    setUploads((u) => [...u, { key, name: file.name, progress: 0 }]);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/uploads?caseId=${encodeURIComponent(caseId)}&ext=${encodeURIComponent(ext)}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: e.loaded / e.total } : x)));
    };
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploads((u) => u.filter((x) => x.key !== key));
        await refresh();
      } else {
        let msg = "بارگذاری فایل ناموفق بود.";
        try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch { /* پاسخ غیر JSON */ }
        setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: msg } : x)));
      }
    };
    xhr.onerror = () => setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: "ارتباط با سرور قطع شد." } : x)));
    xhr.send(file);
  }

  function onFiles(list: FileList | null) {
    setErr("");
    if (!list) return;
    Array.from(list).forEach(uploadOne);
  }

  async function move(i: number, d: -1 | 1) {
    const next = [...items];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    await reorderMedia(caseId, next.map((m) => m.id));
  }

  return (
    <div className="stack gap-12">
      <div
        className={`dropzone${over ? " over" : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}
      >
        <Icon name="upload" />
        <b>فایل‌ها را اینجا رها کنید یا کلیک کنید</b>
        <small>
          JPEG، PNG، TIFF، WebP{wsiEnabled ? "، اسلاید کامل (SVS، NDPI، MRXS…)" : ""}، ویدیو MP4 · تا {faDigits(maxMb)} مگابایت
        </small>
        <input ref={input} type="file" multiple hidden accept={accept.join(",")} onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {err && <div className="alert alert-danger"><Icon name="alert" />{err}</div>}

      {uploads.map((u) => (
        <div key={u.key} className="media-item" style={{ gridTemplateColumns: "1fr auto" }}>
          <div>
            <div className="cell-title" dir="auto" style={{ fontSize: 14 }}>{u.name}</div>
            {u.error ? <div className="err" style={{ color: "var(--danger)", fontSize: 13 }}>{u.error}</div> : (
              <>
                <div className="progress"><div style={{ width: `${Math.round(u.progress * 100)}%` }} /></div>
                <div className="cell-sub">در حال بارگذاری… {faDigits(Math.round(u.progress * 100))}٪</div>
              </>
            )}
          </div>
          {u.error && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>بستن</button>}
        </div>
      ))}

      <div className="media-list">
        {items.map((m, i) => (
          <MediaRow
            key={m.id}
            m={m}
            first={i === 0}
            last={i === items.length - 1}
            onMove={(d) => move(i, d)}
            onDelete={async () => {
              if (!confirm("این تصویر و نشانه‌گذاری‌هایش حذف شود؟")) return;
              await deleteMedia(m.id);
              await refresh();
            }}
            onRetry={async () => { await retryMedia(m.id); await refresh(); }}
            onAnnotate={() => setAnnotating(m)}
          />
        ))}
      </div>

      <datalist id="stains">{STAIN_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="mags">{MAGNIFICATION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>

      {annotating && (
        <AnnotationEditor
          media={annotating}
          onClose={async (changed) => {
            setAnnotating(null);
            if (changed) await refresh();
          }}
        />
      )}
    </div>
  );
}

function MediaRow({ m, first, last, onMove, onDelete, onRetry, onAnnotate }: {
  m: StudioMedia; first: boolean; last: boolean;
  onMove: (d: -1 | 1) => void; onDelete: () => void; onRetry: () => void; onAnnotate: () => void;
}) {
  const [f, setF] = useState({ stain: m.stain, magnification: m.magnification, caption: m.caption });
  const [saved, setSaved] = useState(false);
  const commit = async () => {
    if (f.stain === m.stain && f.magnification === m.magnification && f.caption === m.caption) return;
    await updateMedia(m.id, f);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="media-item">
      <div className="thumb">
        {m.status === "READY" && m.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.thumb} alt="" />
        ) : m.status === "READY" && m.kind === "VIDEO" ? (
          <Icon name="video" size={26} />
        ) : m.status === "FAILED" ? (
          <span style={{ color: "#f08b82", padding: 6, textAlign: "center" }}>پردازش ناموفق</span>
        ) : (
          <span>در حال پردازش…</span>
        )}
      </div>
      <div className="stack gap-8" style={{ minWidth: 0 }}>
        <div className="fields">
          <input className="input input-ltr" list="stains" placeholder="Stain (H&E, CD34…)" value={f.stain} onChange={(e) => setF({ ...f, stain: e.target.value })} onBlur={commit} />
          <input className="input input-ltr" list="mags" placeholder="×40" value={f.magnification} onChange={(e) => setF({ ...f, magnification: e.target.value })} onBlur={commit} />
          <input className="input wide" placeholder="توضیح تصویر (اختیاری) — در مورد ناشناس، تشخیص را ننویسید" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} onBlur={commit} dir="auto" />
        </div>
        <div className="row gap-8" style={{ fontSize: 12.5, color: "var(--muted)", flexWrap: "wrap" }}>
          {m.kind === "WSI" && <span className="badge badge-accent">اسلاید کامل</span>}
          {m.width && m.height && <span className="en">{m.width.toLocaleString()} × {m.height.toLocaleString()} px</span>}
          {m.annotations.length > 0 && <span className="badge">{faDigits(m.annotations.length)} نشانه</span>}
          {m.status === "FAILED" && m.error && <span style={{ color: "var(--danger)" }} className="en">{m.error}</span>}
          {saved && <span style={{ color: "var(--ok)" }}>ذخیره شد</span>}
        </div>
      </div>
      <div className="tools">
        {m.status === "READY" && m.kind !== "VIDEO" && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onAnnotate}><Icon name="arrowTool" /> نشانه‌گذاری</button>
        )}
        {m.status === "FAILED" && <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}><Icon name="refresh" /> تلاش دوباره</button>}
        <div className="row gap-4">
          <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={first} onClick={() => onMove(-1)} aria-label="بالا"><Icon name="up" /></button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={last} onClick={() => onMove(1)} aria-label="پایین"><Icon name="down" /></button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} aria-label="حذف"><Icon name="trash" /></button>
        </div>
      </div>
    </div>
  );
}
