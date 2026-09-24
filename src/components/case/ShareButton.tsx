"use client";

import { useState } from "react";
import { Icon } from "../Icon";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        const url = window.location.href.split("#")[0];
        if (navigator.share) {
          try { await navigator.share({ title, url }); return; } catch { /* انصراف کاربر */ }
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      <Icon name={copied ? "check" : "external"} /> {copied ? "پیوند کپی شد" : "اشتراک"}
    </button>
  );
}
