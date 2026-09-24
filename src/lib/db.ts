import "server-only";
import { PrismaClient } from "@prisma/client";

// یک نمونه در کل فرایند (در حالت توسعه، hot-reload نمونه‌ی جدید نسازد)
const g = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  g.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") g.prisma = db;
