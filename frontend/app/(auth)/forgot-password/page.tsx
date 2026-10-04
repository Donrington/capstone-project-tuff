import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { noIndex } from "@/lib/seo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password", ...noIndex };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot your password?" lede="Enter your email and we'll send you a link to set a new one.">
      <ForgotPasswordForm showDemoLink={process.env.NODE_ENV !== "production"} />
    </AuthCard>
  );
}
