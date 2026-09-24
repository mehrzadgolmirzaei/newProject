"use client";

import { Empty } from "@/components/Empty";

export default function ErrorPage({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  return (
    <div className="wrap" style={{ paddingBlock: 80 }}>
      <Empty icon="alert" title="خطایی رخ داد" text={`لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، این کد را به مدیر سامانه بدهید: ${error.digest ?? "—"}`}>
        <button className="btn btn-primary" onClick={reset}>تلاش دوباره</button>
      </Empty>
    </div>
  );
}
