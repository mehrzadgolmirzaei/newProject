import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canEditCase, getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listMedia } from "@/actions/studio";
import { readiness } from "@/lib/case-form";
import { acceptedExtensions } from "@/lib/media";
import { env } from "@/lib/env";
import { CaseEditor } from "@/components/studio/CaseEditor";

export const metadata: Metadata = { title: "ویرایش مورد", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const c = await db.case.findUnique({
    where: { id },
    include: { ihc: { orderBy: { order: "asc" } }, differentials: { orderBy: { order: "asc" } } },
  });
  if (!c || !canEditCase(user, c)) notFound();
  const [media, missing] = await Promise.all([listMedia(c.id), readiness(c.id)]);

  return (
    <CaseEditor
      caseId={c.id}
      number={c.number}
      status={c.status}
      reviewNote={c.reviewNote}
      directPublish={user!.role === "ADMIN" || user!.trusted}
      initial={{
        title: c.title, subspecialty: c.subspecialty, organ: c.organ, specimenType: c.specimenType, difficulty: c.difficulty,
        mode: c.mode, patientAge: c.patientAge, patientSex: c.patientSex, keywords: c.keywords,
        clinicalHistory: c.clinicalHistory, imaging: c.imaging, gross: c.gross, microscopic: c.microscopic, molecular: c.molecular,
        question: c.question, finalDiagnosis: c.finalDiagnosis, diagnosisAliases: c.diagnosisAliases,
        showIhcBeforeAnswer: c.showIhcBeforeAnswer, commentsEnabled: c.commentsEnabled, discussion: c.discussion, teachingPoints: c.teachingPoints, references: c.references,
        ihc: c.ihc.map((r) => ({ marker: r.marker, outcome: r.outcome, pattern: r.pattern, note: r.note })),
        differentials: c.differentials.map((d) => ({ name: d.name, note: d.note })),
        deidConfirmed: !!c.deidConfirmedAt,
      }}
      media={media}
      missing={missing}
      accept={acceptedExtensions()}
      maxMb={env.MAX_UPLOAD_MB}
      wsiEnabled={!!env.VIPS_BIN}
    />
  );
}
