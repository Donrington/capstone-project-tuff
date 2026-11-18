import { GoogleCallback } from "./GoogleCallback";
import styles from "./callback.module.css";

interface CallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  next?: string;
}

/**
 * Google redirects to this page with the auth code in the URL. It renders a
 * "Signing you in…" state straight away — the token exchange can take a while
 * (a cold backend), and a route handler would leave people staring at Google's
 * page meanwhile. The exchange itself runs in a server action (./actions.ts),
 * since session cookies can only be set from an action or route handler.
 */
export default async function GoogleCallbackPage({
  searchParams,
}: {
  searchParams: Promise<CallbackQuery>;
}) {
  const query = await searchParams;

  return (
    <main className={styles.shell}>
      <GoogleCallback query={query} />
    </main>
  );
}
