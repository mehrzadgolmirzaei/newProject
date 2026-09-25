"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/actions/auth";
import { SPECIALTY_SUGGESTIONS } from "@/lib/taxonomy";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/components/LocaleProvider";

type F = { name: string; medicalNumber: string; specialty: string; institution: string; city: string };

export function ProfileForm({ initial, next, editing }: { initial: F; next: string; editing: boolean }) {
  const router = useRouter();
  const { t, lp } = useI18n();
  const [f, setF] = useState(initial);
  const [err, setErr] = useState<{ msg: string; field?: string } | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="stack gap-16"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveProfile(f);
          if (!r.ok) return setErr({ msg: r.error, field: r.field });
          setErr(null);
          if (editing) { setOk(true); router.refresh(); }
          else { router.replace(lp(next)); router.refresh(); }
        });
      }}
    >
      <div className="field">
        <label htmlFor="name" className="req">{t("نام و نام خانوادگی")}</label>
        <input id="name" className="input" value={f.name} onChange={set("name")} placeholder={t("دکتر …")} aria-invalid={err?.field === "name"} autoFocus={!editing} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="mn" className="req">{t("شماره‌ی نظام پزشکی")}</label>
          <input id="mn" className="input input-ltr" inputMode="numeric" value={f.medicalNumber} onChange={set("medicalNumber")} aria-invalid={err?.field === "medicalNumber"} />
        </div>
        <div className="field">
          <label htmlFor="sp" className="req">{t("رشته / جایگاه")}</label>
          <input id="sp" className="input" list="specialties" value={f.specialty} onChange={set("specialty")} aria-invalid={err?.field === "specialty"} />
          <datalist id="specialties">{SPECIALTY_SUGGESTIONS.map((s) => <option key={s} value={t(s)} />)}</datalist>
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="inst">{t("محل فعالیت")}</label>
          <input id="inst" className="input" value={f.institution} onChange={set("institution")} placeholder={t("بیمارستان، دانشگاه یا آزمایشگاه")} />
        </div>
        <div className="field">
          <label htmlFor="city">{t("شهر")}</label>
          <input id="city" className="input" value={f.city} onChange={set("city")} />
        </div>
      </div>
      {err && <div className="alert alert-danger"><Icon name="alert" />{err.msg}</div>}
      {ok && <div className="alert alert-ok"><Icon name="check" />{t("ذخیره شد.")}</div>}
      <button className="btn btn-primary btn-lg" disabled={pending}>{pending ? t("در حال ذخیره…") : editing ? t("ذخیره‌ی تغییرات") : t("ثبت و ادامه")}</button>
    </form>
  );
}
