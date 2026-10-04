import { expect, test } from "@playwright/test";

// The mock DB is one in-memory store per server process, and several of
// these change it — so they run one after another, in order.
test.describe.configure({ mode: "serial" });

// Start from fresh seed data, even on a dev server that's been running a while.
test.beforeAll(async ({ request }) => {
  const res = await request.post("/dev/reset");
  expect(res.status()).toBe(204);
});

const toNumber = (text: string | null) => Number((text ?? "").replace(/[^\d]/g, ""));

test.describe("returning user", () => {
  test("notifications: the panel opens on its heading and marks everything read", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Notifications, \d+ unread$/ }).click();

    const panel = page.getByRole("dialog", { name: "Notifications" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Notifications" })).toBeFocused();
    await expect(panel.getByText("New").first()).toBeVisible();

    await panel.getByRole("button", { name: "Mark all as read" }).click();
    await expect(panel.getByText("You're all caught up.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  });

  test("search: / focuses it, arrows pick a result, Enter opens it", async ({ page }) => {
    await page.goto("/dashboard");
    const box = page.getByRole("combobox", { name: /search/i });
    // The shortcut listener attaches on hydration, which the dev server can
    // finish after `load` — keep pressing until it's listening.
    await expect(async () => {
      await page.keyboard.press("/");
      await expect(box).toBeFocused({ timeout: 500 });
    }).toPass();

    await box.fill("ironc");
    const option = page.getByRole("option", { name: /Team Ironclad/ });
    await expect(option).toBeVisible();
    await box.press("ArrowDown");
    await expect(option).toHaveAttribute("aria-selected", "true");
    await box.press("Enter");

    // First visit compiles the route in dev, which can take a while.
    await expect(page).toHaveURL(/\/teams\/ironclad$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Team Ironclad", level: 1 })).toBeVisible({ timeout: 30_000 });
  });

  test("search page: says so when nothing matches", async ({ page }) => {
    await page.goto("/search?q=zzzz");
    await expect(page.getByText("No matches for ‘zzzz’. Try a challenge or a teammate's name.")).toBeVisible();
  });

  test("new challenge: Steps starts at your daily goal times the length, not a flat 400", async ({ page }) => {
    await page.goto("/challenges/new");
    const next = () => page.getByRole("button", { name: "Continue" }).click();
    await next(); // Solo
    await page.getByText("Steps", { exact: true }).click();
    await next();

    // 10,000 a day: a flat 400 steps would be cleared by one short walk.
    const target = page.getByLabel(/^Target/);
    await expect(target).toHaveValue("70000");
    await page.getByText("14 days", { exact: true }).click();
    await expect(target).toHaveValue("140000");

    // A number you typed stays put when the length changes.
    await target.fill("50000");
    await page.getByText("30 days", { exact: true }).click();
    await expect(target).toHaveValue("50000");
  });

  test("settings: a new step goal moves the dashboard ring", async ({ page }) => {
    await page.goto("/settings#goals");
    const goals = page.locator("#goals");
    await goals.getByText("8,000", { exact: true }).click();
    await goals.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved.").first()).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText(/ \/ 8,000$/)).toBeVisible();

    // Put it back for anything that runs after.
    await page.goto("/settings#goals");
    await page.locator("#goals").getByText("10,000", { exact: true }).click();
    await page.locator("#goals").getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved.").first()).toBeVisible();
  });

  test("theme: light mode sticks across a reload", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("menuitem", { name: "Light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("menuitem", { name: "Dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("steps can be logged without a challenge, and move the Today ring", async ({ page }) => {
    await page.goto("/dashboard");
    const ring = page.getByText(/^[\d,]+ \/ 10,000$/);
    const before = toNumber((await ring.textContent())?.split("/")[0] ?? "");

    await page.getByRole("button", { name: "Log today's set" }).click();
    const dialog = page.getByRole("dialog", { name: "Log activity" });
    await dialog.getByLabel("Challenge").selectOption("daily-steps");
    await expect(dialog.getByText("Leaderboard points come from challenges.")).toBeVisible();
    await dialog.getByLabel("How many steps?").fill("1000");
    await dialog.getByRole("button", { name: "Log 1,000 steps" }).click();

    await expect(page.getByText(`${(before + 1000).toLocaleString("en-US")} / 10,000`)).toBeVisible();
  });

  test("logging moves the challenge total and shows up in its history", async ({ page }) => {
    await page.goto("/challenges/plank-ladder");
    const total = page.getByText(/ \/ 1,190 seconds$/);
    const before = toNumber((await total.textContent())?.split("/")[0] ?? "");

    await page.getByRole("button", { name: "Log today's activity" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("How many seconds?").fill("100");
    await dialog.getByRole("button", { name: "Log 100 seconds" }).click();

    await expect(page.getByText(`${(before + 100).toLocaleString("en-US")} / 1,190 seconds`)).toBeVisible();
    await expect(page.getByText("You logged 100 seconds").first()).toBeVisible();
  });
});

test.describe("new user", () => {
  // First in the block, so the account is still the untouched seed with no challenges.
  test("the empty Today ring takes steps with no challenge, and fills", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "tuff-persona", value: "new", url: baseURL! }]);
    await page.goto("/dashboard");
    await expect(page.getByText("Log your steps to fill the ring.")).toBeVisible();

    await page.getByRole("button", { name: "Log steps" }).click();
    const dialog = page.getByRole("dialog", { name: "Log activity" });
    // No challenges yet, so the dialog opens on the no-challenge option.
    await expect(dialog.getByLabel("Challenge")).toHaveValue("daily-steps");
    await dialog.getByLabel("How many steps?").fill("2500");
    await dialog.getByRole("button", { name: "Log 2,500 steps" }).click();

    await expect(page.getByText("2,500 steps today.")).toBeVisible();
    await expect(page.getByText(/^2,500 \/ [\d,]+$/)).toBeVisible();
  });

  test("sign up → onboarding → a dashboard that reflects the answers", async ({ page }) => {
    await page.goto("/");
    const signup = page.locator('[aria-label="Create an account"]');
    await signup.getByLabel("First name").fill("Zainab");
    await signup.getByLabel("Last name").fill("Okoro");
    await signup.getByLabel("Email").fill("zainab.okoro@example.com");
    await signup.getByLabel("Password", { exact: true }).fill("password123");
    await signup.getByLabel(/I agree/).check();
    await signup.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: "What brings you to TUFF, Zainab?" })).toBeVisible();
    const next = () => page.getByRole("button", { name: "Continue" }).click();

    await page.getByText("Build a streak").click();
    await next();

    await expect(page.getByRole("heading", { name: "A little about you" })).toBeFocused();
    await page.getByLabel("Height (cm)").fill("170");
    await page.getByLabel("Weight (kg)").fill("65");
    await page.getByText("Beginner", { exact: true }).click();
    await next();

    await page.getByText("8,000", { exact: true }).click();
    await next();

    await page.getByText("Daily 8K Walk").click();
    await next();

    await page.getByText("I have a code").click();
    await page.getByLabel("Invite code").fill("IRON-7Q4K");
    await next();

    await expect(page.getByText("Daily goal: 8,000 steps.")).toBeVisible();
    await page.getByRole("button", { name: "Go to your dashboard" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Welcome to TUFF.")).toBeVisible();
    await expect(page.getByText("0 / 8,000")).toBeVisible();
    await expect(page.getByText("Daily 8K Walk").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Team Ironclad" })).toBeVisible();

    await page.goto("/leaderboard");
    await expect(page.getByText("You're not ranked yet.")).toBeVisible();
  });

  test("leaving a team, then starting one", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "tuff-persona", value: "new", url: baseURL! }]);
    await page.goto("/teams/ironclad");
    await page.getByRole("button", { name: "Leave team" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Leave team" }).click();

    await expect(page).toHaveURL(/\/teams(\?|$)/);
    await expect(page.getByText("You're not on a team yet")).toBeVisible();

    await page.getByRole("button", { name: "Create a team" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Create a team" });
    await dialog.getByLabel("Team name").fill("Team Lekki Loop");
    await dialog.getByRole("button", { name: "Create team" }).click();

    await expect(page).toHaveURL(/\/teams\/team-lekki-loop/);
    await expect(page.getByRole("heading", { name: "Team Lekki Loop", level: 1 })).toBeVisible();
    await expect(page.getByText("Team created.")).toBeVisible();
  });
});

test.describe("auth and system pages", () => {
  test("forgot and reset password, end to end", async ({ page }) => {
    await page.goto("/?mode=signin");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    await page.getByLabel("Email").fill("anyone@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/If that email has a TUFF account/)).toBeVisible();

    await page.getByRole("link", { name: "Open the reset page (demo)" }).click();
    await page.getByLabel("New password", { exact: true }).fill("newpassword1");
    await page.getByLabel("Confirm new password", { exact: true }).fill("different1");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("The two passwords don't match.")).toBeVisible();

    // React resets the form after each submit, so both fields start empty again.
    await page.getByLabel("New password", { exact: true }).fill("newpassword1");
    await page.getByLabel("Confirm new password", { exact: true }).fill("newpassword1");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page).toHaveURL(/mode=signin/, { timeout: 30_000 });
    await expect(page.getByText("Password updated.")).toBeVisible();
  });

  test("an unknown URL gets the branded 404", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Nothing here." })).toBeVisible();
  });
});

test.describe("phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("settings: the section pills stay in view below the top bar while you scroll", async ({ page }) => {
    await page.goto("/settings");
    const nav = page.getByRole("navigation", { name: "Settings sections" });

    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(nav.getByRole("link", { name: "Profile" })).toBeInViewport();

    // Sticking is not enough if the top bar sits on top of it.
    const { navTop, barBottom, covered } = await nav.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const bar = document.querySelector("header")?.getBoundingClientRect();
      return { navTop: r.top, barBottom: bar?.bottom ?? 0, covered: !el.contains(hit) };
    });
    expect(covered).toBe(false);
    expect(navTop).toBeGreaterThanOrEqual(barBottom);

    // Jumping to a section lands it below the pills, not under them.
    await nav.getByRole("link", { name: "Privacy" }).click();
    await expect(nav.getByRole("link", { name: "Privacy" })).toHaveAttribute("aria-current", "location");
    const gap = await page.evaluate(() => {
      const pills = document.querySelector('nav[aria-label="Settings sections"]')!.getBoundingClientRect();
      return document.getElementById("privacy")!.getBoundingClientRect().top - pills.bottom;
    });
    expect(gap).toBeGreaterThanOrEqual(0);
  });

  test("search opens in a sheet, and the top-bar avatar opens the account menu", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Search" });
    const box = sheet.getByRole("combobox");
    await expect(box).toBeFocused();
    await box.fill("plank");
    await expect(sheet.getByRole("option", { name: /Plank Ladder/ })).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: /^Account:/ }).click();
    await expect(page.getByRole("menuitem", { name: "View profile" })).toBeVisible();
  });

  test("back to top: shows up after scrolling, and takes you back to the top", async ({ page }) => {
    await page.goto("/dashboard");
    const button = page.getByRole("button", { name: "Back to top" });
    await expect(button).toHaveAttribute("data-visible", "false");

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(button).toHaveAttribute("data-visible", "true");
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);

    await button.click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBe(0);
    await expect(button).toHaveAttribute("data-visible", "false");
  });
});
