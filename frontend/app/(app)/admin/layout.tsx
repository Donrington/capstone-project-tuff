import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser as getSession } from "@/lib/auth/get-current-user";

export const metadata: Metadata = { title: "Admin" };

/**
 * Everything under /admin is for admins. Anyone else gets the ordinary 404 —
 * the page doesn't announce itself — and the backend refuses their API calls
 * regardless, so this is about not showing a dead end, not about security.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.role !== "admin") notFound();
  return children;
}
