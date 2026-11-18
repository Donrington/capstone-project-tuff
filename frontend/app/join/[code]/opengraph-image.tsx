import { ImageResponse } from "next/og";
import { getInvitePreview } from "@/lib/data";
import { safeJoinPath } from "@/lib/invite";
import { InviteCard, loadLogoDataUrl } from "./invite-card";

export const runtime = "nodejs";
export const alt = "TUFF invite preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A file-based image route outranks the site-wide openGraph.images entry. */
export default async function OpengraphImage({ params }: { params: Promise<{ code: string }> }) {
  const { code: codeParam } = await params;
  const path = safeJoinPath(codeParam);
  const code = path?.slice("/join/".length) ?? null;

  // A failed lookup still gets a card — a broken share preview is worse than
  // a generic one, and the public endpoint is allowed to be briefly down.
  const [preview, logo] = await Promise.all([
    code ? getInvitePreview(code).catch(() => null) : Promise.resolve(null),
    loadLogoDataUrl(),
  ]);

  return new ImageResponse(<InviteCard preview={preview} code={code} logo={logo} />, size);
}
