// تم سایت: روشن (پیش‌فرض) یا تیره — انتخاب کاربر در کوکی نگه‌داری می‌شود تا صفحه از همان ابتدا با تم درست ساخته شود
export const THEME_COOKIE = "vp_theme";
export type Theme = "light" | "dark";
export const parseTheme = (v: string | undefined): Theme => (v === "dark" ? "dark" : "light");
