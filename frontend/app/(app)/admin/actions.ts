"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser as getSession } from "@/lib/auth/get-current-user";
import { cancelAdminChallenge, updateAdminUser } from "@/lib/data";
import type { AdminResult } from "@/lib/types";

/**
 * Server actions for the admin pages. Each one checks the session is an admin
 * before doing anything — a server action is a public endpoint whatever the
 * page showed — and the backend checks again against the database, so this is
 * the quick no, not the security boundary.
 */

const NOT_ALLOWED: AdminResult = { ok: false, error: "Only admins can do that." };

async function isAdmin() {
  return (await getSession())?.role === "admin";
}

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function setUserStatusAction(id: string, status: "active" | "suspended"): Promise<AdminResult> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  if (status !== "active" && status !== "suspended") return { ok: false, error: "Unknown status." };
  const result = await updateAdminUser(id, { status });
  if (result.ok) refresh();
  return result;
}

export async function setUserRoleAction(id: string, role: "member" | "admin"): Promise<AdminResult> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  if (role !== "member" && role !== "admin") return { ok: false, error: "Unknown role." };
  const result = await updateAdminUser(id, { role });
  if (result.ok) refresh();
  return result;
}

export async function cancelChallengeAction(id: string): Promise<AdminResult> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const result = await cancelAdminChallenge(id);
  if (result.ok) refresh();
  return result;
}
