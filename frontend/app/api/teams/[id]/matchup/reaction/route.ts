import { reply, type MatchupContext } from "@/lib/api/route-reply";
import { clearMatchupReaction, setMatchupReaction } from "@/lib/data";
import { isMatchupReaction } from "@/lib/matchup";

/**
 * One reaction per member per UTC week. Writes live at their own path, not on
 * the matchup route, so the client can address them like the backend endpoints
 * (PUT to set, DELETE to clear) and every read still goes through the parent.
 */
export async function PUT(request: Request, { params }: MatchupContext) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!isMatchupReaction(body?.emoji)) {
    return Response.json(
      { error: { message: "Choose fire, muscle, clap or grit." } },
      { status: 400 },
    );
  }
  return reply(() => setMatchupReaction(id, body.emoji));
}

export async function DELETE(_request: Request, { params }: MatchupContext) {
  const { id } = await params;
  return reply(() => clearMatchupReaction(id));
}
