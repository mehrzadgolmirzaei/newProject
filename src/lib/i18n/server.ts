import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { localePath, type Locale } from "./config";
import { makeT } from "./translate";
import { fmt } from "../format";

/** زبان درخواست جاری (از proxy.ts) */
export const getLocale = cache(async (): Promise<Locale> => ((await headers()).get("x-locale") === "en" ? "en" : "fa"));

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: makeT(locale), lp: (p: string) => localePath(locale, p), f: fmt(locale) };
}

/** redirect با حفظ زبان جاری */
export async function lredirect(path: string): Promise<never> {
  redirect(localePath(await getLocale(), path));
}
