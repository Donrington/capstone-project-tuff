"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MOCK_SESSION_COOKIE } from "@/lib/auth/get-current-user";

export interface AuthState {
  errors?: Partial<Record<"name" | "email" | "password" | "terms", string>>;
  message?: string;
  values?: { name?: string; email?: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const acceptedTerms = formData.get("terms") === "on";

  const errors: AuthState["errors"] = {};
  if (name.length < 2) errors.name = "Tell us what to call you.";
  if (!EMAIL_RE.test(email)) errors.email = "That doesn't look like an email address.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  if (!acceptedTerms) errors.terms = "Accept the terms to continue.";

  if (Object.keys(errors).length > 0) {
    return { errors, values: { name, email } };
  }

  // TODO(auth): create the account against the backend and start a real
  // session — see README "What's not here yet". Until then this just ends
  // the mock's signed-out state.
  (await cookies()).delete(MOCK_SESSION_COOKIE);
  redirect("/dashboard");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const errors: AuthState["errors"] = {};
  if (!EMAIL_RE.test(email)) errors.email = "Enter the email you signed up with.";
  if (!password) errors.password = "Enter your password.";

  if (Object.keys(errors).length > 0) {
    return { errors, values: { email } };
  }

  // TODO(auth): verify credentials against the backend before redirecting.
  (await cookies()).delete(MOCK_SESSION_COOKIE);
  redirect("/dashboard");
}
