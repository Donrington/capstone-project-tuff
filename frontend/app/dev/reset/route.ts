import { DATA_SOURCE } from "@/lib/api/config";

/**
 * Dev only, mock data only: throws the in-memory mock DB away so the next
 * read re-seeds it. The e2e specs call this first, so they start from the
 * same data even on a dev server that's been running (and mutated) a while.
 *
 * The admin pages' mock DB (see storeKey in lib/data/mock.ts) is separate: a
 * plain reset leaves it, `?scope=admin` resets only it, so specs that run side
 * by side can't wipe each other's data.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || DATA_SOURCE !== "mock") {
    return new Response(null, { status: 404 });
  }
  const dbs = globalThis.__tuffDbs;
  if (new URL(request.url).searchParams.get("scope") === "admin") {
    if (dbs) delete dbs.admin;
  } else {
    globalThis.__tuffDbs = dbs?.admin ? { admin: dbs.admin } : undefined;
  }
  return new Response(null, { status: 204 });
}
