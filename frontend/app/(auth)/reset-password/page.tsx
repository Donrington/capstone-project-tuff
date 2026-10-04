import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { AuthCard } from "@/components/auth/AuthCard";
import { noIndex } from "@/lib/seo";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Set a new password", ...noIndex };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  // TODO(backend): check the token is real and unexpired before showing the form.
  if (!token) {
    return (
      <AuthCard title="That link has expired" lede="Reset links only last 30 minutes. Ask for a fresh one.">
        <ButtonLink href="/forgot-password" size="lg" fullWidth>
          Send a new link
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password" lede="Pick something you haven't used here before.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
