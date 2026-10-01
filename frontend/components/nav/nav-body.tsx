import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DATA_SOURCE } from "@/lib/api/config";
import { getPersona } from "@/lib/data";
import { NavList } from "./nav-list";
import { NavLogButton, TopBarLogButton } from "./nav-log-button";
import { NavPro } from "./nav-pro";
import { NavProfile, NavTopBarProfile } from "./nav-profile";
import styles from "./nav.module.css";

/** The dev-only persona switch (#20) — mock data only, never in production. */
async function switchablePersona() {
  return DATA_SOURCE === "mock" && process.env.NODE_ENV !== "production" ? getPersona() : null;
}

/**
 * Everything in the nav that depends on who's signed in: which links show,
 * the main action, and the profile slot. It streams in behind NavSkeleton,
 * which has the same shape, so nothing shifts when it lands.
 */
export async function NavBody() {
  const [user, persona] = await Promise.all([getCurrentUser(), switchablePersona()]);

  return (
    <>
      {user && <NavLogButton />}
      <NavList signedIn={user !== null} role={user?.role ?? null} />
      <div className={styles.bottom}>
        {user && <NavPro />}
        <NavProfile user={user} persona={persona} />
      </div>
    </>
  );
}

/** The small-screen top bar's actions — only when someone's signed in. */
export async function NavTopBarAction() {
  const [user, persona] = await Promise.all([getCurrentUser(), switchablePersona()]);
  if (!user) return null;
  return (
    <>
      <TopBarLogButton />
      <NavTopBarProfile user={user} persona={persona} />
    </>
  );
}
