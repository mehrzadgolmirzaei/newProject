"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** منوی کشویی مبتنی بر <details> — بدون JS هم کار می‌کند؛ با JS با کلیک بیرون و Esc بسته می‌شود */
export function Dropdown({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [path]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current) ref.current.open = false;
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <details className="menu" ref={ref}>
      <summary>{summary}</summary>
      <div className="menu-panel">{children}</div>
    </details>
  );
}
