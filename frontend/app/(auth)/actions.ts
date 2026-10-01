"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MOCK_SESSION_COOKIE } from "@/lib/auth/get-current-user";
import { PERSONA_COOKIE, startNewPersona } from "@/lib/data";

export interface AuthState {
  errors?: Partial<Record<"firstName" | "lastName" | "email" | "password" | "terms", string>>;
  message?: string;
  values?: { firstName?: string; lastName?: string; email?: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const acceptedTerms = formData.get("terms") === "on";

  const errors: AuthState["errors"] = {};
  if (firstName.length < 1) errors.firstName = "Tell us what to call you.";
  if (lastName.length < 1) errors.lastName = "Enter your last name.";
  if (!EMAIL_RE.test(email)) errors.email = "That doesn't look like an email address.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  if (!acceptedTerms) errors.terms = "Accept the terms to continue.";

  if (Object.keys(errors).length > 0) {
    return { errors, values: { firstName, lastName, email } };
  }

  // TODO(auth): create the account against the backend and start a real
  // session — see README "What's not here yet". Until then this ends the
  // mock's signed-out state and switches to a brand-new account (#20) with
  // the name just entered.
  const jar = await cookies();
  jar.delete(MOCK_SESSION_COOKIE);
  startNewPersona({ firstName, lastName, email });
  jar.set(PERSONA_COOKIE, "new", { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
  redirect("/onboarding");
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
  // The mock signs you back in as the returning account (#20).
  const jar = await cookies();
  jar.delete(MOCK_SESSION_COOKIE);
  jar.delete(PERSONA_COOKIE);
  redirect("/dashboard");
}

export interface ResetRequestState {
  sent?: boolean;
  errors?: { email?: string };
  values?: { email?: string };
}

/** Always answers the same way, whatever the email, so the page never
 *  reveals which addresses have accounts. */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return { errors: { email: "Enter the email you signed up with." }, values: { email } };
  }
  // TODO(backend): POST /api/auth/forgot-password { email } — emails a
  // 30-minute reset link. Not built yet; needs an email provider.
  return { sent: true };
}

export interface ResetPasswordState {
  errors?: { password?: string; confirm?: string };
  message?: string;
}

export async function resetPassword(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const errors: ResetPasswordState["errors"] = {};
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  if (confirm !== password) errors.confirm = "The two passwords don't match.";
  if (Object.keys(errors).length > 0) return { errors };
  if (!token) return { message: "That link has expired. Ask for a new one." };

  // TODO(backend): POST /api/auth/reset-password { token, password }.
  redirect("/?mode=signin&flash=password-reset");
}
