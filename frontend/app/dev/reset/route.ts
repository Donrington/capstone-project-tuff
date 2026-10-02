import { DATA_SOURCE } from "@/lib/api/config";

/**
 * Dev only, mock data only: throws the in-memory mock DB away so the next
 * read re-seeds it. The e2e specs call this first, so they start from the
 * same data even on a dev server that's been running (and mutated) a while.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production" || DATA_SOURCE !== "mock") {
    return new Response(null, { status: 404 });
  }
  globalThis.__tuffDbs = undefined;
  return new Response(null, { status: 204 });
}
