"use client";

import type { Annotation } from "./types";
import { shapeGeometry, type OSDModule, type OSDViewer } from "./osd";

/** لایه‌ی SVG روی نمایشگر؛ با هر tick مختصات از نو محاسبه می‌شود */
export function AnnotationLayer({
  viewer,
  osd,
  items,
  selected,
  onSelect,
  drawing,
  svgProps,
  tick,
}: {
  viewer: OSDViewer;
  osd: OSDModule;
  items: Annotation[];
  selected?: number | null;
  onSelect?: (i: number) => void;
  drawing?: boolean;
  svgProps?: React.SVGProps<SVGSVGElement>;
  tick: number;
}) {
  void tick; // وابستگی رندر
  if (!viewer || !osd) return null;
  return (
    <svg className={`annot-layer${drawing ? " drawing" : ""}`} {...svgProps}>
      {items.map((a, i) => {
        const g = shapeGeometry(viewer, osd, a);
        if (!g) return null;
        const cls = `annot-shape${a.spoiler ? " spoiler" : ""}${selected === i ? " selected" : ""}`;
        const pick = onSelect ? () => onSelect(i) : undefined;
        return (
          <g key={a.id ?? i}>
            {g.kind === "arrow" ? (
              <>
                <line {...g.line} className={cls} />
                <polygon points={g.head} className={cls} style={{ fill: "currentColor" }} color={selected === i ? "#7fd4ff" : a.spoiler ? "#ff7eb3" : "#ffe066"} />
                {pick && <line {...g.line} className="annot-hit" onPointerDown={(e) => { e.stopPropagation(); pick(); }} />}
              </>
            ) : g.kind === "ellipse" ? (
              <>
                <ellipse cx={g.box.x + g.box.w / 2} cy={g.box.y + g.box.h / 2} rx={g.box.w / 2} ry={g.box.h / 2} className={cls} />
                {pick && <ellipse cx={g.box.x + g.box.w / 2} cy={g.box.y + g.box.h / 2} rx={g.box.w / 2} ry={g.box.h / 2} className="annot-hit" onPointerDown={(e) => { e.stopPropagation(); pick(); }} />}
              </>
            ) : (
              <>
                <rect x={g.box.x} y={g.box.y} width={g.box.w} height={g.box.h} rx={3} className={cls} />
                {pick && <rect x={g.box.x} y={g.box.y} width={g.box.w} height={g.box.h} className="annot-hit" onPointerDown={(e) => { e.stopPropagation(); pick(); }} />}
              </>
            )}
            {a.label && (
              <text x={g.label.x} y={g.label.y} className="annot-label" textAnchor="middle" direction="rtl" unicodeBidi="plaintext">
                {a.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
