/**
 * The allowlist for post-auth redirects. Only a canonical invite URL can be a
 * `next` destination — not another page in the app, and never an absolute or
 * protocol-relative URL. Pure (no `next/headers`) so client and server code can
 * both import it.
 */
const SAFE_NEXT = /^\/join\/[A-Za-z0-9]{1,32}$/;

export function safeNext(value: unknown): string | null {
  return typeof value === "string" && SAFE_NEXT.test(value) ? value : null;
}
