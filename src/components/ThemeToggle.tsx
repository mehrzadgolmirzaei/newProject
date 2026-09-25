"use client";

import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { Icon } from "./Icon";
import { useI18n } from "./LocaleProvider";

/** دکمه‌ی تغییر تم با نماد خورشید و ماه */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const { t } = useI18n();

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    // انتقال نرم رنگ‌ها فقط در لحظه‌ی تغییر تم
    root.classList.add("theme-switching");
    root.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0a0d18" : "#ffffff");
    setTheme(next);
    window.setTimeout(() => root.classList.remove("theme-switching"), 450);
  }

  const label = theme === "dark" ? t("تم روشن") : t("تم تیره");
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label} data-mode={theme}>
      <span className="tt-icon tt-sun"><Icon name="sun" size={18} /></span>
      <span className="tt-icon tt-moon"><Icon name="moon" size={18} /></span>
    </button>
  );
}
