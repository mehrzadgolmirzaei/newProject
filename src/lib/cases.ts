import "server-only";
import type { Prisma, CaseMode, Difficulty, SpecimenType } from "@prisma/client";
import { db } from "./db";
import { canBrowse, canModerateCase, isAdmin, type CurrentUser } from "./auth";
import { mediaUrl } from "./storage";
import { normalizeFa } from "./text";

// ─── فهرست موارد ───────────────────────────────────────────────────────────

export type CaseFilters = {
  q?: string;
  sub?: string;
  difficulty?: Difficulty;
  mode?: CaseMode;
  specimen?: SpecimenType;
  sort?: "new" | "discussed" | "attempted";
  status?: "unsolved" | "solved";
  page?: number;
};

export const PAGE_SIZE = 18;

const cardSelect = {
  id: true,
  number: true,
  title: true,
  subspecialty: true,
  organ: true,
  difficulty: true,
  mode: true,
  specimenType: true,
  finalDiagnosis: true,
  isDemo: true,
  publishedAt: true,
  featuredAt: true,
  author: { select: { name: true, specialty: true } },
  media: {
    where: { status: "READY" as const },
    orderBy: { order: "asc" as const },
    take: 1,
    select: { thumbKey: true, previewKey: true, stain: true },
  },
  _count: {
    select: {
      attempts: true,
      media: { where: { status: "READY" as const } },
      comments: { where: { status: "VISIBLE" as const } },
    },
  },
} satisfies Prisma.CaseSelect;

type CardRow = Prisma.CaseGetPayload<{ select: typeof cardSelect }>;

export type CaseCard = {
  id: string;
  number: number;
  title: string;
  subspecialty: string;
  organ: string;
  difficulty: Difficulty;
  mode: CaseMode;
  specimenType: SpecimenType | null;
  diagnosis: string | null; // فقط برای مورد آموزشی یا پس از پاسخ کاربر
  isDemo: boolean;
  publishedAt: Date | null;
  author: string;
  authorSpecialty: string | null;
  thumb: string | null;
  preview: string | null;
  stain: string;
  attempts: number;
  comments: number;
  images: number;
  solved: boolean;
};

function toCard(c: CardRow, solvedIds: Set<string>): CaseCard {
  const solved = solvedIds.has(c.id);
  return {
    id: c.id,
    number: c.number,
    title: c.title,
    subspecialty: c.subspecialty,
    organ: c.organ,
    difficulty: c.difficulty,
    mode: c.mode,
    specimenType: c.specimenType,
    diagnosis: c.mode === "TEACHING" || solved ? c.finalDiagnosis : null,
    isDemo: c.isDemo,
    publishedAt: c.publishedAt,
    author: c.author.name ?? "—",
    authorSpecialty: c.author.specialty,
    thumb: mediaUrl(c.media[0]?.thumbKey),
    preview: mediaUrl(c.media[0]?.previewKey),
    stain: c.media[0]?.stain ?? "",
    attempts: c._count.attempts,
    comments: c._count.comments,
    images: c._count.media,
    solved,
  };
}

async function solvedSet(user: CurrentUser | null, caseIds: string[]) {
  if (!user || caseIds.length === 0) return new Set<string>();
  const rows = await db.attempt.findMany({ where: { userId: user.id, caseId: { in: caseIds } }, select: { caseId: true } });
  return new Set(rows.map((r) => r.caseId));
}

export async function cardsFor(rows: CardRow[], user: CurrentUser | null) {
  const solved = await solvedSet(user, rows.map((r) => r.id));
  return rows.map((r) => toCard(r, solved));
}

export function searchWhere(q: string): Prisma.CaseWhereInput {
  const term = normalizeFa(q);
  const has = { contains: term, mode: "insensitive" as const };
  return {
    OR: [
      { title: has },
      { organ: has },
      { clinicalHistory: has },
      { microscopic: has },
      { keywords: { has: term.toLowerCase() } },
      // تشخیص فقط در موارد آموزشی جست‌وجو می‌شود تا پاسخ موارد ناشناس لو نرود
      { AND: [{ mode: "TEACHING" }, { OR: [{ finalDiagnosis: has }, { discussion: has }] }] },
    ],
  };
}

export async function listCases(f: CaseFilters, user: CurrentUser | null) {
  const where: Prisma.CaseWhereInput = { status: "PUBLISHED" };
  const and: Prisma.CaseWhereInput[] = [];
  if (f.q?.trim()) and.push(searchWhere(f.q.trim()));
  if (f.sub) where.subspecialty = f.sub;
  if (f.difficulty) where.difficulty = f.difficulty;
  if (f.mode) where.mode = f.mode;
  if (f.specimen) where.specimenType = f.specimen;
  if (user && f.status === "solved") and.push({ attempts: { some: { userId: user.id } } });
  if (user && f.status === "unsolved") and.push({ attempts: { none: { userId: user.id } } });
  if (and.length) where.AND = and;

  const orderBy: Prisma.CaseOrderByWithRelationInput[] =
    f.sort === "discussed"
      ? [{ comments: { _count: "desc" } }, { publishedAt: "desc" }]
      : f.sort === "attempted"
        ? [{ attempts: { _count: "desc" } }, { publishedAt: "desc" }]
        : [{ publishedAt: "desc" }];

  const page = Math.max(1, f.page ?? 1);
  const [total, rows] = await Promise.all([
    db.case.count({ where }),
    db.case.findMany({ where, orderBy, select: cardSelect, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), cases: await cardsFor(rows, user) };
}

export async function latestCases(user: CurrentUser | null, take = 6, excludeId?: string) {
  const rows = await db.case.findMany({
    where: { status: "PUBLISHED", ...(excludeId ? { id: { not: excludeId } } : {}) },
    orderBy: { publishedAt: "desc" },
    take,
    select: cardSelect,
  });
  return cardsFor(rows, user);
}

export async function featuredCase(user: CurrentUser | null) {
  const row =
    (await db.case.findFirst({ where: { status: "PUBLISHED", featuredAt: { not: null } }, orderBy: { featuredAt: "desc" }, select: cardSelect })) ??
    (await db.case.findFirst({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: cardSelect }));
  if (!row) return null;
  return (await cardsFor([row], user))[0];
}

export async function subspecialtyCounts() {
  const rows = await db.case.groupBy({ by: ["subspecialty"], where: { status: "PUBLISHED" }, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.subspecialty, r._count._all])) as Record<string, number>;
}

export async function contributors(take = 8) {
  const rows = await db.user.findMany({
    where: { status: "ACTIVE", cases: { some: { status: "PUBLISHED" } } },
    select: {
      id: true, name: true, specialty: true, institution: true,
      _count: { select: { cases: { where: { status: "PUBLISHED" } } } },
    },
    orderBy: { cases: { _count: "desc" } },
    take,
  });
  return rows.map((r) => ({ id: r.id, name: r.name ?? "—", specialty: r.specialty, institution: r.institution, cases: r._count.cases }));
}

export async function siteStats() {
  const [cases, contributorsCount, members, attempts] = await Promise.all([
    db.case.count({ where: { status: "PUBLISHED" } }),
    db.user.count({ where: { status: "ACTIVE", cases: { some: { status: "PUBLISHED" } } } }),
    db.user.count({ where: { status: "ACTIVE" } }),
    db.attempt.count(),
  ]);
  return { cases, contributors: contributorsCount, members, attempts };
}

// ─── صفحه‌ی مورد ───────────────────────────────────────────────────────────
// قانون مهم: هر چیزی که پیش از پاسخ نباید دیده شود، اصلاً به مرورگر فرستاده نمی‌شود.

export async function getCaseView(number: number, user: CurrentUser | null) {
  const c = await db.case.findUnique({
    where: { number },
    include: {
      author: { select: { id: true, name: true, specialty: true, institution: true } },
      media: {
        where: { status: "READY" },
        orderBy: { order: "asc" },
        include: { annotations: { orderBy: { createdAt: "asc" } } },
      },
      ihc: { orderBy: { order: "asc" } },
      differentials: { orderBy: { order: "asc" } },
      _count: { select: { attempts: true, comments: { where: { status: "VISIBLE" } } } },
    },
  });
  if (!c) return null;

  const isOwner = !!user && user.id === c.authorId;
  const moderator = canModerateCase(user, c);
  if (c.status === "PUBLISHED") {
    if (!canBrowse(user)) return { gated: true as const };
  } else if (!isOwner && !isAdmin(user)) {
    return null;
  }

  const attempt = user ? await db.attempt.findUnique({ where: { userId_caseId: { userId: user.id, caseId: c.id } } }) : null;
  const revealed = c.mode === "TEACHING" || !!attempt || moderator;
  const saved = user ? !!(await db.savedCase.findUnique({ where: { userId_caseId: { userId: user.id, caseId: c.id } } })) : false;

  const media = c.media.map((m) => ({
    id: m.id,
    kind: m.kind,
    stain: m.stain,
    magnification: m.magnification,
    caption: m.caption,
    width: m.width,
    height: m.height,
    dzi: mediaUrl(m.dziKey),
    thumb: mediaUrl(m.thumbKey),
    preview: mediaUrl(m.previewKey),
    video: mediaUrl(m.videoKey),
    annotations: m.annotations
      .filter((a) => revealed || !a.spoiler)
      .map((a) => ({ id: a.id, shape: a.shape, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, label: a.label, spoiler: a.spoiler })),
  }));

  return {
    gated: false as const,
    id: c.id,
    number: c.number,
    status: c.status,
    mode: c.mode,
    isDemo: c.isDemo,
    title: c.title,
    subspecialty: c.subspecialty,
    organ: c.organ,
    specimenType: c.specimenType,
    difficulty: c.difficulty,
    patientAge: c.patientAge,
    patientSex: c.patientSex,
    clinicalHistory: c.clinicalHistory,
    imaging: c.imaging,
    gross: c.gross,
    microscopic: c.microscopic,
    molecular: revealed || c.showIhcBeforeAnswer ? c.molecular : "",
    question: c.question,
    ihc: revealed || c.showIhcBeforeAnswer ? c.ihc : [],
    ihcHidden: !revealed && !c.showIhcBeforeAnswer && c.ihc.length > 0,
    publishedAt: c.publishedAt,
    updatedAt: c.updatedAt,
    featuredAt: c.featuredAt,
    reviewNote: isOwner || isAdmin(user) ? c.reviewNote : null,
    author: c.author,
    media,
    counts: { attempts: c._count.attempts, comments: c._count.comments },
    viewer: { isOwner, moderator, saved, revealed, attempt },
    // ↓ فقط پس از پاسخ
    answer: revealed
      ? {
          finalDiagnosis: c.finalDiagnosis,
          differentials: c.differentials,
          discussion: c.discussion,
          teachingPoints: c.teachingPoints,
          references: c.references,
        }
      : null,
  };
}

export type CaseView = Exclude<NonNullable<Awaited<ReturnType<typeof getCaseView>>>, { gated: true }>;

/** آمار پاسخ‌ها: درصد درستی و پرتکرارترین پاسخ‌ها */
export async function attemptStats(caseId: string) {
  const [total, gaveUp, correct, groups] = await Promise.all([
    db.attempt.count({ where: { caseId } }),
    db.attempt.count({ where: { caseId, gaveUp: true } }),
    db.attempt.count({
      where: { caseId, gaveUp: false, OR: [{ gradedCorrect: true }, { gradedCorrect: null, autoCorrect: true }] },
    }),
    db.$queryRaw<{ normalized: string; sample: string; n: bigint; correct: boolean }[]>`
      SELECT "normalized", MIN("answer") AS sample, COUNT(*) AS n,
             BOOL_OR(COALESCE("gradedCorrect", "autoCorrect")) AS correct
      FROM "Attempt"
      WHERE "caseId" = ${caseId} AND "gaveUp" = false AND "normalized" <> ''
      GROUP BY "normalized"
      ORDER BY n DESC
      LIMIT 6`,
  ]);
  const answered = total - gaveUp;
  return {
    total,
    answered,
    gaveUp,
    correct,
    top: groups.map((g) => ({ answer: g.sample, count: Number(g.n), correct: g.correct })),
  };
}

/** رشته‌ی بحث — پاسخ‌ها زیر هر نظر؛ نظرهای سنجاق‌شده اول */
export async function getThread(caseId: string, moderator: boolean) {
  const rows = await db.comment.findMany({
    where: { caseId, ...(moderator ? {} : { status: { in: ["VISIBLE", "DELETED"] } }) },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, specialty: true, role: true } } },
  });
  type Node = (typeof rows)[number] & { replies: typeof rows };
  const byId = new Map<string, Node>();
  const roots: Node[] = [];
  for (const r of rows) byId.set(r.id, { ...r, replies: [] });
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parentId && byId.has(r.parentId)) byId.get(r.parentId)!.replies.push(node);
    else if (!r.parentId) roots.push(node);
  }
  // نظر حذف‌شده‌ای که پاسخی ندارد، نمایش داده نمی‌شود
  const visible = roots.filter((n) => n.status !== "DELETED" || n.replies.length > 0);
  visible.sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.createdAt.getTime() - b.createdAt.getTime());
  return visible.map((n) => ({
    ...n,
    body: n.status === "DELETED" ? "" : n.body,
    replies: n.replies.map((r) => ({ ...r, body: r.status === "DELETED" ? "" : r.body })),
  }));
}

export type ThreadNode = Awaited<ReturnType<typeof getThread>>[number];

/** کارت‌های چند مورد مشخص، به همان ترتیب شناسه‌ها */
export async function cardsByIds(ids: string[], user: CurrentUser | null) {
  if (!ids.length) return [];
  const rows = await db.case.findMany({ where: { id: { in: ids }, status: "PUBLISHED" }, select: cardSelect });
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return cardsFor(rows, user);
}
