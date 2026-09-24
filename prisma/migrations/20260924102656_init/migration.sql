-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CONTRIBUTOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseMode" AS ENUM ('UNKNOWN', 'TEACHING');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "SpecimenType" AS ENUM ('BIOPSY', 'EXCISION', 'RESECTION', 'FNA', 'FLUID_CYTOLOGY', 'GYN_CYTOLOGY', 'BONE_MARROW', 'FROZEN_SECTION', 'CONSULTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'WSI', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AnnotationShape" AS ENUM ('ARROW', 'ELLIPSE', 'RECT');

-- CreateEnum
CREATE TYPE "IhcOutcome" AS ENUM ('POSITIVE', 'NEGATIVE', 'FOCAL', 'WEAK', 'EQUIVOCAL', 'LOST', 'RETAINED');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "medicalNumber" TEXT,
    "specialty" TEXT,
    "institution" TEXT,
    "city" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'DRAFT',
    "mode" "CaseMode" NOT NULL DEFAULT 'UNKNOWN',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT '',
    "subspecialty" TEXT NOT NULL DEFAULT '',
    "organ" TEXT NOT NULL DEFAULT '',
    "specimenType" "SpecimenType",
    "difficulty" "Difficulty" NOT NULL DEFAULT 'INTERMEDIATE',
    "patientAge" INTEGER,
    "patientSex" "Sex" NOT NULL DEFAULT 'UNSPECIFIED',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clinicalHistory" TEXT NOT NULL DEFAULT '',
    "imaging" TEXT NOT NULL DEFAULT '',
    "gross" TEXT NOT NULL DEFAULT '',
    "microscopic" TEXT NOT NULL DEFAULT '',
    "molecular" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL DEFAULT '',
    "finalDiagnosis" TEXT NOT NULL DEFAULT '',
    "diagnosisAliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "showIhcBeforeAnswer" BOOLEAN NOT NULL DEFAULT true,
    "discussion" TEXT NOT NULL DEFAULT '',
    "teachingPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deidConfirmedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "featuredAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'UPLOADING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "stain" TEXT NOT NULL DEFAULT '',
    "magnification" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "sourceKey" TEXT,
    "sourceExt" TEXT,
    "sourceSize" BIGINT,
    "dziKey" TEXT,
    "thumbKey" TEXT,
    "previewKey" TEXT,
    "videoKey" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "error" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "shape" "AnnotationShape" NOT NULL,
    "x1" DOUBLE PRECISION NOT NULL,
    "y1" DOUBLE PRECISION NOT NULL,
    "x2" DOUBLE PRECISION NOT NULL,
    "y2" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "spoiler" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IhcResult" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "marker" TEXT NOT NULL,
    "outcome" "IhcOutcome" NOT NULL,
    "pattern" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IhcResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Differential" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Differential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "normalized" TEXT NOT NULL DEFAULT '',
    "confidence" "Confidence",
    "gaveUp" BOOLEAN NOT NULL DEFAULT false,
    "autoCorrect" BOOLEAN NOT NULL DEFAULT false,
    "gradedCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'VISIBLE',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_medicalNumber_key" ON "User"("medicalNumber");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "OtpCode_phone_createdAt_idx" ON "OtpCode"("phone", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Case_number_key" ON "Case"("number");

-- CreateIndex
CREATE INDEX "Case_status_publishedAt_idx" ON "Case"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Case_subspecialty_status_idx" ON "Case"("subspecialty", "status");

-- CreateIndex
CREATE INDEX "Case_authorId_status_idx" ON "Case"("authorId", "status");

-- CreateIndex
CREATE INDEX "Case_featuredAt_idx" ON "Case"("featuredAt");

-- CreateIndex
CREATE INDEX "MediaAsset_caseId_order_idx" ON "MediaAsset"("caseId", "order");

-- CreateIndex
CREATE INDEX "MediaAsset_status_idx" ON "MediaAsset"("status");

-- CreateIndex
CREATE INDEX "Annotation_mediaId_idx" ON "Annotation"("mediaId");

-- CreateIndex
CREATE INDEX "IhcResult_caseId_order_idx" ON "IhcResult"("caseId", "order");

-- CreateIndex
CREATE INDEX "Differential_caseId_order_idx" ON "Differential"("caseId", "order");

-- CreateIndex
CREATE INDEX "Attempt_caseId_idx" ON "Attempt"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_userId_caseId_key" ON "Attempt"("userId", "caseId");

-- CreateIndex
CREATE INDEX "Comment_caseId_createdAt_idx" ON "Comment"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedCase_userId_caseId_key" ON "SavedCase"("userId", "caseId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IhcResult" ADD CONSTRAINT "IhcResult_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Differential" ADD CONSTRAINT "Differential_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCase" ADD CONSTRAINT "SavedCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCase" ADD CONSTRAINT "SavedCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
