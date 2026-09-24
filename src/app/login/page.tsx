import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "ورود پزشکان", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const user = await getUser();
  if (user) redirect(user.profileComplete ? safeNext : "/onboarding");
  return (
    <div className="wrap auth">
      <div className="panel panel-pad auth-card">
        <LoginForm next={safeNext} />
      </div>
    </div>
  );
}
