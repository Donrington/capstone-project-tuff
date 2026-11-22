/**
 * The browser never calls the API — every request comes from this Next
 * server — so without help the API sees our server's IP for every visitor,
 * and its per-IP rate limits would lump everyone into one bucket. These
 * headers pass the visitor's real IP along. The shared secret proves the IP
 * came from us: the API ignores the IP header without it, so a client can't
 * forge an IP to dodge a limit. No secret configured → no headers, and the
 * API falls back to its generous site-wide caps.
 */
export const CLIENT_IP_HEADER = "x-tuff-client-ip";
export const EDGE_KEY_HEADER = "x-tuff-edge-key";

export function edgeHeadersFrom(get: (name: string) => string | null | undefined): Record<string, string> {
  const secret = process.env.EDGE_SHARED_SECRET;
  if (!secret) return {};
  // On Vercel, x-real-ip / the first x-forwarded-for entry is the visitor.
  const ip = get("x-real-ip") ?? get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? { [CLIENT_IP_HEADER]: ip, [EDGE_KEY_HEADER]: secret } : {};
}
