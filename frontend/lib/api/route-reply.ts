import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";

/** Shared by the matchup route and its reaction sub-route. The browser sees
 *  the backend's status and message, never a raw stack or backend URL. */
export async function reply(run: () => Promise<unknown>) {
  try {
    return NextResponse.json(await run());
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: { message: err.message, details: err.details } },
        { status: err.status },
      );
    }
    throw err;
  }
}

/** Matches the dynamic segment in app/api/teams/[id]/matchup/. */
export type MatchupContext = { params: Promise<{ id: string }> };
