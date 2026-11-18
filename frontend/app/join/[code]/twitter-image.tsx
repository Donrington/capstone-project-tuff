import OpengraphImage from "./opengraph-image";

// X uses its own metadata tag, but the card itself is byte-for-byte the OG one.
// Keep these config values literal in this file: Next's static analyzer rejects
// re-exported route settings such as `runtime`.
export const runtime = "nodejs";
export const alt = "TUFF invite preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OpengraphImage;
