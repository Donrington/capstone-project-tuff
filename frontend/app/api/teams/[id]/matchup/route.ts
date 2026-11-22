import { getMatchup } from "@/lib/data";
import { reply, type MatchupContext } from "@/lib/api/route-reply";

/**
 * The browser only ever talks to Next routes, never straight to Express.
 * Cookies are forwarded through lib/api/client.ts (or read by the mock source
 * in e2e), so the backend URL and raw session token stay off the client. The
 * backend remains the authority on who may see a team; a 404 here is
 * deliberately indistinguishable from a team that doesn't exist.
 */
export async function GET(_request: Request, { params }: MatchupContext) {
  const { id } = await params;
  return reply(() => getMatchup(id));
}
