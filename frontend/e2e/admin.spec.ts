import { expect, test } from "@playwright/test";

// These change the mock DB, so they run in order from a fresh seed. Admins get
// a mock DB of their own, so this can run beside the other specs.
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  const res = await request.post("/dev/reset?scope=admin");
  expect(res.status()).toBe(204);
});

test.describe("members", () => {
  test("don't see the Admin link, and /admin shows the 404 page", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" })).toHaveCount(0);

    for (const path of ["/admin", "/admin/users", "/admin/challenges", "/admin/teams"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Nothing here." }), path).toBeVisible();
      await expect(page.getByRole("heading", { name: "Overview" })).toHaveCount(0);
    }
  });
});

test.describe("admins", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: "tuff-mock-role", value: "admin", url: baseURL! }]);
  });

  test("get an Admin link and an overview", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
    const tiles = page.getByRole("list").filter({ hasText: "Active this week" });
    await expect(tiles.getByText("Members", { exact: true })).toBeVisible();
    await expect(tiles.getByText("Suspended", { exact: true })).toBeVisible();
    await expect(tiles.getByText("Live challenges")).toBeVisible();
    await expect(page.getByText(/new members in the last 14 days/)).toBeVisible();

    const sections = page.getByRole("navigation", { name: "Admin sections" });
    await expect(sections.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  });

  test("members: search, suspend, filter, reactivate, promote — and not yourself", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Members", level: 1 })).toBeVisible();

    // Your own row says "You" and offers nothing.
    const me = page.getByRole("row", { name: /Kelechi Obi/ });
    await expect(me.getByText("You", { exact: true })).toBeVisible();
    await expect(me.getByRole("button")).toHaveCount(0);

    // Search narrows the list.
    const filters = page.getByRole("search", { name: "Filter members" });
    await filters.getByLabel("Search").fill("tunde");
    await filters.getByRole("button", { name: "Filter" }).click();
    await expect(page).toHaveURL(/q=tunde/);
    await expect(page.getByRole("row", { name: /Tunde Bakare/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Funmilayo/ })).toHaveCount(0);

    // Suspend: asks first, says what happens, then does it.
    const tunde = page.getByRole("row", { name: /Tunde Bakare/ });
    await tunde.getByRole("button", { name: "Suspend" }).click();
    const dialog = page.getByRole("dialog", { name: "Suspend Tunde Bakare?" });
    await expect(dialog.getByText(/signed out and can't sign back in/)).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(tunde.getByText("Active", { exact: true })).toBeVisible(); // cancelled: nothing changed

    await tunde.getByRole("button", { name: "Suspend" }).click();
    await page.getByRole("dialog", { name: "Suspend Tunde Bakare?" }).getByRole("button", { name: "Suspend" }).click();
    await expect(page.getByText("Tunde Bakare is suspended.")).toBeVisible();
    await expect(tunde.getByText("Suspended", { exact: true })).toBeVisible();

    // The status filter finds them; reactivating takes them off it.
    await page.goto("/admin/users?status=suspended");
    await expect(page.getByRole("row", { name: /Tunde Bakare/ })).toBeVisible();
    await page.getByRole("row", { name: /Tunde Bakare/ }).getByRole("button", { name: "Reactivate" }).click();
    await page.getByRole("dialog", { name: "Reactivate Tunde Bakare?" }).getByRole("button", { name: "Reactivate" }).click();
    await expect(page.getByText("Tunde Bakare is active again.")).toBeVisible();
    await expect(page.getByRole("row", { name: /Tunde Bakare/ })).toHaveCount(0);

    // Promote and demote.
    await page.goto("/admin/users?q=amina");
    const amina = page.getByRole("row", { name: /Amina Lawal/ });
    await amina.getByRole("button", { name: "Make admin" }).click();
    await page.getByRole("dialog", { name: "Make Amina Lawal an admin?" }).getByRole("button", { name: "Make admin" }).click();
    await expect(page.getByText("Amina Lawal is now an admin.")).toBeVisible();
    await expect(amina.getByText("Admin", { exact: true })).toBeVisible();
    await expect(amina.getByRole("button", { name: "Remove admin" })).toBeVisible();
  });

  test("members: a search with no match says so, and ignores junk in the URL", async ({ page }) => {
    await page.goto("/admin/users?q=zzzzzz");
    await expect(page.getByText("No one matches.")).toBeVisible();
    await page.getByRole("link", { name: "Clear" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);

    const response = await page.goto("/admin/users?status=bogus&role=%3Cscript%3E&page=-9");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Members", level: 1 })).toBeVisible();
  });

  test("challenges: filter by status, and cancel one", async ({ page }) => {
    await page.goto("/admin/challenges");
    await expect(page.getByRole("heading", { name: "Challenges", level: 1 })).toBeVisible();
    const row = page.getByRole("row", { name: /Plank Ladder/ });
    await expect(row.getByText("Active", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Cancel" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancel Plank Ladder?" });
    await expect(dialog.getByText(/This can't be undone/)).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel challenge" }).click();
    await expect(page.getByText("Plank Ladder was cancelled.")).toBeVisible();
    await expect(row.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Cancel" })).toHaveCount(0);

    await page.getByRole("navigation", { name: "Filter by status" }).getByRole("link", { name: "Cancelled" }).click();
    await expect(page).toHaveURL(/status=cancelled/);
    await expect(page.getByRole("row", { name: /Plank Ladder/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Push-Up Power Week/ })).toHaveCount(0);
  });

  test("teams: lists them with member counts", async ({ page }) => {
    await page.goto("/admin/teams");
    await expect(page.getByRole("heading", { name: "Teams", level: 1 })).toBeVisible();
    await expect(page.getByRole("row", { name: /Team Ironclad/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Team Ironclad.*\d+ \/ 10/ })).toBeVisible();
  });

  test("on a phone the tables scroll inside themselves, not the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Members", level: 1 })).toBeVisible();
    const sideways = await page.evaluate(() => {
      window.scrollTo(300, 0);
      return window.scrollX;
    });
    expect(sideways).toBe(0);
    await expect(page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: "Teams" })).toBeAttached();
  });
});
