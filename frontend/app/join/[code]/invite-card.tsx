import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties } from "react";
import { inviteDetail, inviteKicker, inviteTitle, type InvitePreview } from "@/lib/invite";

/** The real mark, embedded as a data URL so the image generator doesn't need
 *  to make a second HTTP request back to this app. */
export async function loadLogoDataUrl(): Promise<string> {
  const base64 = await readFile(join(process.cwd(), "public/logo/logo_2.png"), "base64");
  return `data:image/png;base64,${base64}`;
}

const shell: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "68px 76px 0",
  backgroundColor: "#0b0b0d",
  color: "#f4f4f5",
};

const topRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const tag: CSSProperties = {
  padding: "12px 24px",
  borderRadius: 999,
  border: "1px solid #2e2e33",
  color: "#9c9ca5",
  fontSize: 20,
  letterSpacing: 2,
};

const main: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  marginBottom: "auto",
  marginTop: 54,
};

const kicker: CSSProperties = {
  color: "#d7ff3d",
  fontSize: 24,
  fontWeight: 800,
  letterSpacing: 5,
  textTransform: "uppercase",
  marginBottom: 26,
};

const title: CSSProperties = {
  fontSize: 78,
  fontWeight: 800,
  lineHeight: 1.05,
  letterSpacing: -2,
  maxWidth: 1000,
};

const sub: CSSProperties = {
  marginTop: 26,
  color: "#9c9ca5",
  fontSize: 30,
  lineHeight: 1.35,
};

const codePill: CSSProperties = {
  marginTop: 42,
  padding: "16px 30px",
  borderRadius: 999,
  backgroundColor: "#26262a",
  color: "#f4f4f5",
  fontSize: 26,
  letterSpacing: 5,
};

const gradient: CSSProperties = {
  height: 14,
  width: "100%",
  marginTop: 54,
  backgroundImage: "linear-gradient(90deg, #d7ff3d 0%, #fa5705 100%)",
};

/** Shared by the Open Graph and Twitter generators so both previews stay identical. */
export function InviteCard({
  preview,
  code,
  logo,
}: {
  preview: InvitePreview | null;
  code: string | null;
  logo: string;
}) {
  const headline = preview ? `Join ${inviteTitle(preview)}` : "You've been invited";
  const firstLine = preview ? `${preview.inviterFirstName} invited you to TUFF.` : "A team or challenge is waiting for you.";
  const secondLine = preview ? inviteDetail(preview) : "Open the link to see who's calling you in.";

  return (
    <div style={shell}>
      <div style={topRow}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders its own tree, not a browser page. */}
        <img src={logo} alt="TUFF" width={240} height={80} />
        <div style={tag}>TUFF INVITE</div>
      </div>

      <div style={main}>
        <div style={kicker}>{preview ? inviteKicker(preview) : "Invite preview"}</div>
        <div style={title}>{headline}</div>
        <div style={sub}>{firstLine}</div>
        <div style={sub}>{secondLine}</div>
        <div style={codePill}>{code ?? "TUFF"}</div>
      </div>

      <div style={gradient} />
    </div>
  );
}
