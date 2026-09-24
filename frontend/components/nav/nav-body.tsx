import { getCurrentUser } from "@/lib/auth/get-current-user";
import { NavList } from "./nav-list";
import { NavLogButton, TopBarLogButton } from "./nav-log-button";
import { NavPro } from "./nav-pro";
import { NavProfile } from "./nav-profile";
import styles from "./nav.module.css";

/**
 * Everything in the nav that depends on who's signed in: which links show,
 * the main action, and the profile slot. It streams in behind NavSkeleton,
 * which has the same shape, so nothing shifts when it lands.
 */
export async function NavBody() {
  const user = await getCurrentUser();

  return (
    <>
      {user && <NavLogButton />}
      <NavList signedIn={user !== null} role={user?.role ?? null} />
      <div className={styles.bottom}>
        {user && <NavPro />}
        <NavProfile user={user} />
      </div>
    </>
  );
}

/** The small-screen top bar's action — only when there's someone to log for. */
export async function NavTopBarAction() {
  const user = await getCurrentUser();
  return user ? <TopBarLogButton /> : null;
}
