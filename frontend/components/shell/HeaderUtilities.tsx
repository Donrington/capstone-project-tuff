import { getNotifications, getSearchIndex } from "@/lib/data";
import { NotificationsButton } from "./NotificationsButton";
import { SearchBox } from "./SearchBox";

/**
 * Search and the bell, in the same spot on every app page. PageHeader renders
 * this after any page-specific actions, so no page wires them up itself.
 */
export async function HeaderUtilities() {
  const [notifications, index] = await Promise.all([getNotifications(), getSearchIndex()]);
  const now = new Date().toISOString();

  return (
    <>
      <SearchBox index={index} />
      <NotificationsButton notifications={notifications} now={now} />
    </>
  );
}
