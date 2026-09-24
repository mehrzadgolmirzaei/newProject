import type { Metadata } from "next";
import { contributors } from "@/lib/cases";
import { initials, faDigits } from "@/lib/text";
import { Empty } from "@/components/Empty";

export const metadata: Metadata = { title: "ارائه‌دهندگان" };
export const dynamic = "force-dynamic";

export default async function Contributors() {
  const people = await contributors(100);
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>ارائه‌دهندگان</h1>
        <p>پاتولوژیست‌هایی که موارد دشوار خود را برای آموزش همکاران در این سامانه ثبت کرده‌اند. ارائه‌دهندگان توسط مدیر سامانه تعیین می‌شوند.</p>
      </div>
      {people.length === 0 ? (
        <Empty icon="users" title="هنوز موردی منتشر نشده است" />
      ) : (
        <div className="people">
          {people.map((p) => (
            <div key={p.id} className="person">
              <span className="avatar avatar-lg">{initials(p.name)}</span>
              <div>
                <b>{p.name}</b>
                <span>{[p.specialty, p.institution].filter(Boolean).join(" · ")}</span>
                <div className="muted" style={{ fontSize: 12.5 }}>{faDigits(p.cases)} مورد منتشرشده</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
