"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * حرکت‌های سراسری سایت، بدون کتابخانه‌ی خارجی:
 *  - [data-reveal]  ← هنگام ورود به دید، با حرکت نرم ظاهر می‌شود (با --i برای تأخیر پله‌ای)
 *  - [data-count]   ← عدد از صفر تا مقدار نهایی شمرده می‌شود
 *  - html[data-scrolled] ← سایه‌ی سربرگ پس از اسکرول
 * پنهان‌سازی اولیه در CSS انجام می‌شود؛ بدون جاوااسکریپت، محتوا پس از لحظه‌ای خودبه‌خود ظاهر می‌شود
 * و با «کاهش حرکت» سیستم، همه‌چیز بی‌حرکت و کامل نمایش داده می‌شود.
 */
export function Motion() {
  const path = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => root.toggleAttribute("data-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
      return;
    }

    const fmt = new Intl.NumberFormat("fa-IR");
    const count = (el: HTMLElement) => {
      const to = Number(el.dataset.count);
      if (!Number.isFinite(to) || to <= 0) return;
      const start = performance.now();
      const dur = Math.min(1600, 700 + to * 12);
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        el.textContent = fmt.format(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("is-in");
          if (!reduce) {
            if (el.dataset.count) count(el);
            el.querySelectorAll<HTMLElement>("[data-count]").forEach(count);
          }
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () =>
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    scan();
    // محتوایی که پس از بارگذاری اضافه می‌شود (ناوبری سمت کاربر، صفحه‌بندی)
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [path]);

  return null;
}
