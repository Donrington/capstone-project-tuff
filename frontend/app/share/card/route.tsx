import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import type { ReactNode } from "react";
import { getCurrentUser as getSessionUser } from "@/lib/auth/get-current-user";
import { getCurrentUser as getProfileUser, getChallengeDetail, getTodayStats } from "@/lib/data";
import { SHARE_CARD_FOOTER, challengeCardCopy, challengeWinFromDetail, streakCardCopy } from "@/lib/share-card";

// The PNG needs the filesystem for the real logo, and it always reflects the
// signed-in user right now — never prerender it or let a cache keep it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;
const CANVAS = "#0b0b0d";
const SURFACE = "#151517";
const BORDER = "#2e2e33";
const INK = "#f4f4f5";
const MUTED = "#9c9ca5";
const VOLT = "#d7ff3d";
const SURGE = "#fa5705";

/** Read once at module load: satori needs a data URL, not a public path. */
const logoDataUrl = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/logo/logo_2.png"))).toString("base64")}`;

function error(status: number, message: string) {
  return new Response(message, { status, headers: PRIVATE_HEADERS });
}

function CameraGlyph() {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: 26,
        height: 18,
        marginRight: 10,
        borderRadius: 5,
        border: `2px solid ${MUTED}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 7,
          top: 3,
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: MUTED,
        }}
      />
    </div>
  );
}

function CardFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: CANVAS,
        padding: 48,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          padding: 72,
          borderRadius: 48,
          border: `1px solid ${BORDER}`,
          backgroundColor: SURFACE,
        }}
      >
        {/* One restrained brand gradient, used as an accent band below the kicker. */}
        <div
          style={{
            position: "absolute",
            right: -180,
            top: -180,
            width: 420,
            height: 420,
            borderRadius: 999,
            backgroundColor: "rgba(215, 255, 61, 0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -220,
            bottom: -240,
            width: 460,
            height: 460,
            borderRadius: 999,
            backgroundColor: "rgba(250, 87, 5, 0.05)",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- satori renders a plain img from a data URL; next/image cannot. */}
        <img src={logoDataUrl} alt="" width={360} height={119} style={{ width: 360, height: 119 }} />
        {children}
      </div>
    </div>
  );
}

function BigStat({ number, unit }: { number: string; unit: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", marginTop: 48 }}>
      <div
        style={{
          display: "flex",
          fontSize: number.length > 5 ? 140 : 190,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: -8,
          color: INK,
        }}
      >
        {number}
      </div>
      <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.4, marginLeft: 18, color: VOLT }}>
        {unit}
      </div>
    </div>
  );
}

function Footer({ firstName }: { firstName: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
      <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: INK }}>{firstName}</div>
      <div style={{ display: "flex", fontSize: 24, color: MUTED, marginTop: 8 }}>{SHARE_CARD_FOOTER}</div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  // The proxy guards /share too, but a card is personal: check the session
  // again here so a direct request can never render someone else's numbers.
  const session = await getSessionUser();
  if (!session) return error(401, "Sign in to make a card.");

  const { searchParams } = request.nextUrl;
  const kind = searchParams.get("kind");
  const profile = await getProfileUser();
  if (!profile) return error(401, "Sign in to make a card.");

  if (kind === "challenge") {
    const id = searchParams.get("id");
    if (!id) return error(404, "Not found.");
    const detail = await getChallengeDetail(id);
    const win = detail ? challengeWinFromDetail(detail, profile.timezone) : null;
    if (!detail || !win) return error(404, "Not found.");

    const copy = challengeCardCopy({
      title: detail.challenge.title,
      unit: detail.challenge.unit,
      total: win.total,
      days: win.days,
      cameraCounted: win.cameraCounted,
      teamTotal: win.teamTotal,
      firstName: profile.firstName,
    });

    return new ImageResponse(
      <CardFrame>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: 72 }}>
          <div
            style={{
              display: "flex",
              width: 120,
              height: 10,
              borderRadius: 999,
              backgroundImage: `linear-gradient(90deg, ${VOLT}, ${SURGE})`,
            }}
          />
          <div
            style={{
              display: "flex",
              marginLeft: 20,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {copy.kicker}
          </div>
        </div>

        <BigStat number={copy.number} unit={copy.unit} />

        <div style={{ display: "flex", fontSize: 48, fontWeight: 800, lineHeight: 1.15, color: INK, marginTop: 40 }}>
          {copy.title}
        </div>
        {copy.detail && (
          <div style={{ display: "flex", fontSize: 30, color: MUTED, marginTop: 16 }}>{copy.detail}</div>
        )}
        {copy.cameraLine && (
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: 28, fontSize: 24, color: MUTED }}>
            <CameraGlyph />
            <div style={{ display: "flex" }}>{copy.cameraLine}</div>
          </div>
        )}

        <Footer firstName={copy.firstName} />
      </CardFrame>,
      { width: 1080, height: 1080, headers: PRIVATE_HEADERS },
    );
  }

  if (kind === "streak") {
    const { streakDays } = await getTodayStats();
    if (streakDays < 3) return error(404, "Not found.");

    const copy = streakCardCopy({ days: streakDays, firstName: profile.firstName });

    return new ImageResponse(
      <CardFrame>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: 72 }}>
          <div
            style={{
              display: "flex",
              width: 120,
              height: 10,
              borderRadius: 999,
              backgroundImage: `linear-gradient(90deg, ${VOLT}, ${SURGE})`,
            }}
          />
          <div
            style={{
              display: "flex",
              marginLeft: 20,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {copy.kicker}
          </div>
        </div>

        <BigStat number={copy.number} unit={copy.unit} />

        <div style={{ display: "flex", fontSize: 48, fontWeight: 800, lineHeight: 1.15, color: INK, marginTop: 40 }}>
          {copy.line}
        </div>

        <Footer firstName={copy.firstName} />
      </CardFrame>,
      { width: 1080, height: 1080, headers: PRIVATE_HEADERS },
    );
  }

  return error(404, "Not found.");
}
