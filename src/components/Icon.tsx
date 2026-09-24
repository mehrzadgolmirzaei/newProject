// مجموعه‌ی آیکن‌های خطی سبک (۲۴×۲۴، ضخامت ۱.۸) — بدون وابستگی خارجی
const P: Record<string, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  bookmark: <path d="M6 4h12v16l-6-4-6 4z" />,
  bookmarkFill: <path d="M6 4h12v16l-6-4-6 4z" fill="currentColor" />,
  zoomIn: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></>,
  zoomOut: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6" /></>,
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  rotate: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v5h-5" /></>,
  message: <path d="M5 5h14v10H9l-4 4z" />,
  check: <path d="m5 12 5 5 9-10" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  xCircle: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
  upload: <path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" />,
  image: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" /></>,
  layers: <path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5" />,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <path d="M3 3l18 18M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 19c1.2-3.4 3.6-5 6.5-5s5.3 1.6 6.5 5M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .6 3.3 2.3 4 5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  pin: <path d="M9 4h6l-1 6 4 3v2H6v-2l4-3zM12 15v6" />,
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  microscope: <path d="M6 21h12M9 17h6M12 17v-3M9 7l3-3 3 3-3 3zM12 10a5 5 0 1 1 3.5 8.5" />,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  inbox: <path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z" />,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  logout: <path d="M15 4h4v16h-4M10 16l4-4-4-4M14 12H3" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
  alert: <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.5" /></>,
  flask: <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10" />,
  dna: <path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12M8 6h8M8 18h8M9.5 9h5M9.5 15h5" />,
  arrowTool: <path d="M5 19 19 5m0 0h-8m8 0v8" />,
  ellipse: <ellipse cx="12" cy="12" rx="9" ry="6" />,
  rect: <rect x="4" y="6" width="16" height="12" rx="1" />,
  hand: <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7-2.5 0-4-1.2-5.5-3.5L3.7 14.6a1.5 1.5 0 0 1 2.5-1.7L8 15" />,
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  refresh: <path d="M20 12a8 8 0 0 1-14.3 5M4 12a8 8 0 0 1 14.3-5M20 4v4h-4M4 20v-4h4" />,
  send: <path d="M20 4 3 11l7 2 2 7z" />,
  reply: <path d="M10 8 4 13l6 5M4 13h10a6 6 0 0 1 6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  history: <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
  scan: <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M4 12h16" />,
};

export type IconName = keyof typeof P;

export function Icon({ name, size, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {P[name]}
    </svg>
  );
}
