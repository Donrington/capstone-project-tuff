import { expect, test, type Page } from "@playwright/test";

const rail = (page: Page) => page.locator("#app-nav");
const primaryNav = (page: Page) => page.getByRole("navigation", { name: "Primary" });

test.describe("app navigation, desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("starts collapsed, and the toggle expands and collapses it", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(rail(page)).toHaveAttribute("data-state", "collapsed");

    const expand = page.getByRole("button", { name: "Expand navigation" });
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expect(expand).toHaveAttribute("aria-controls", "app-nav");
    await expand.click();
    await expect(rail(page)).toHaveAttribute("data-state", "expanded");

    const collapse = page.getByRole("button", { name: "Collapse navigation" });
    await expect(collapse).toHaveAttribute("aria-expanded", "true");
    await collapse.click();
    await expect(rail(page)).toHaveAttribute("data-state", "collapsed");
  });

  test("keeps its state across a reload, rendered on the server", async ({ page, context }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Expand navigation" }).click();
    await expect
      .poll(async () => (await context.cookies()).find((c) => c.name === "nav-state")?.value)
      .toBe("expanded");

    await page.reload();
    await expect(rail(page)).toHaveAttribute("data-state", "expanded");

    // The server's HTML already carries the state, so the rail doesn't flash.
    const html = await (await page.request.get("/dashboard")).text();
    expect(html.match(/<aside[^>]*id="app-nav"[^>]*>/)?.[0]).toContain('data-state="expanded"');
  });

  test("marks the current page", async ({ page }) => {
    await page.goto("/challenges");
    await expect(primaryNav(page).getByRole("link", { name: "Challenges" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      await primaryNav(page).getByRole("link", { name: "Dashboard" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  test("shows a collapsed link's label as a tooltip on keyboard focus", async ({ page }) => {
    await page.goto("/dashboard");
    await page.keyboard.press("Tab"); // keyboard modality, so focus is :focus-visible
    await primaryNav(page).getByRole("link", { name: "Challenges" }).focus();
    await expect(rail(page).locator("[popover]").filter({ hasText: /^Challenges$/ })).toBeVisible();
  });

  test("signed in: shows the account with name and email", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: /^Account: .+, .+@.+/ })).toBeVisible();
    await expect(rail(page).getByRole("link", { name: "Sign in" })).toHaveCount(0);
  });

  test("signed out: offers Sign in and hides the members-only links", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "tuff-mock-session", value: "signed-out", url: baseURL! }]);
    await page.goto("/dashboard");

    await expect(rail(page).getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(primaryNav(page).getByRole("link", { name: "About TUFF" })).toBeVisible();
    await expect(primaryNav(page).getByRole("link", { name: "Challenges" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Account:/ })).toHaveCount(0);
  });

  test("shows a skeleton while the session loads", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "tuff-mock-latency", value: "2500", url: baseURL! }]);
    await page.goto("/dashboard", { waitUntil: "commit" });

    const skeleton = rail(page).locator('[aria-busy="true"]');
    await expect(skeleton).toBeAttached();
    await expect(page.getByRole("button", { name: /^Account:/ })).toBeVisible({ timeout: 15_000 });
    await expect(skeleton).toHaveCount(0);
  });

  test("the profile menu works from the keyboard", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "nav-state", value: "expanded", url: baseURL! }]);
    await page.goto("/dashboard");

    const trigger = page.getByRole("button", { name: /^Account:/ });
    await trigger.focus();
    await page.keyboard.press("Enter");

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Settings" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test.describe("app navigation, mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the drawer opens as a modal and Escape closes it", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(rail(page)).toBeHidden();

    const open = page.getByRole("button", { name: "Open navigation" });
    await open.click();
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await expect(drawer).toBeVisible();
    await expect(open).toHaveAttribute("aria-expanded", "true");
    await expect(drawer.getByRole("navigation", { name: "Primary" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(open).toBeFocused();
  });
});
