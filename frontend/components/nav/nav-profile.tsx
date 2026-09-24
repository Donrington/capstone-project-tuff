import type { SessionUser } from "@/lib/auth/get-current-user";
import { NavSignIn } from "./nav-sign-in";
import { ProfileMenu } from "./profile-menu";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

/** The profile slot: the signed-in block, or Sign in. Only the minimal,
 *  serializable parts of the user cross into the client. */
export function NavProfile({ user }: { user: SessionUser | null }) {
  if (!user) return <NavSignIn />;

  return (
    <ProfileMenu
      user={{
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        initials: initialsOf(user.name),
      }}
    />
  );
}
