import type { Metadata } from "next";
import { AuthSplit, type AuthMode } from "./AuthSplit";

export const metadata: Metadata = {
  title: "Join the challenge",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode: AuthMode = mode === "signin" ? "signin" : "signup";
  return <AuthSplit initialMode={initialMode} />;
}
