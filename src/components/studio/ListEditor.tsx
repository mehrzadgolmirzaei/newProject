"use client";

import { useState } from "react";
import { Icon } from "../Icon";

/** ویرایش فهرست ساده‌ی رشته‌ها — حالت inline به‌صورت برچسب (برای کلیدواژه‌ها) */
export function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  ltr,
  inline,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  addLabel: string;
  ltr?: boolean;
  inline?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft("");
  };

  if (inline) {
    return (
      <div className="stack gap-8">
        {items.length > 0 && (
          <div className="row gap-4" style={{ flexWrap: "wrap" }}>
            {items.map((k) => (
              <span key={k} className="badge badge-outline" dir="auto">
                {k}
                <button type="button" onClick={() => onChange(items.filter((x) => x !== k))} aria-label={`حذف ${k}`} style={{ border: 0, background: "none", cursor: "pointer", padding: 0, color: "inherit", display: "grid" }}>
                  <Icon name="x" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="row gap-8">
          <input className={`input${ltr ? " input-ltr" : ""}`} value={draft} placeholder={placeholder} dir="auto"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={add} disabled={!draft.trim()}><Icon name="plus" /> {addLabel}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rows">
      {items.map((it, i) => (
        <div key={i} className="row-edit list">
          <input className={`input${ltr ? " input-ltr" : ""}`} value={it} dir="auto" onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="حذف" onClick={() => onChange(items.filter((_, j) => j !== i))}><Icon name="trash" /></button>
        </div>
      ))}
      <div className="row-edit list">
        <input className={`input${ltr ? " input-ltr" : ""}`} value={draft} placeholder={placeholder} dir="auto"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="btn btn-secondary btn-icon btn-sm" aria-label={addLabel} title={addLabel} onClick={add} disabled={!draft.trim()}><Icon name="plus" /></button>
      </div>
    </div>
  );
}
