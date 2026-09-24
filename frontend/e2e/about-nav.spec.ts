import { expect, test } from "@playwright/test";

test.describe("About page nav, desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("marks the section you're reading", async ({ page }) => {
    await page.goto("/about");
    const links = page.getByRole("navigation", { name: "About sections" }).getByRole("link");
    await expect(links).toHaveText(["Story", "How it works", "Community"]);

    await links.filter({ hasText: "How it works" }).click();
    await expect(links.filter({ hasText: "How it works" })).toHaveAttribute("aria-current", "true");
    await expect(page.locator("#how")).toBeFocused();
    expect(await links.filter({ hasText: "Story" }).getAttribute("aria-current")).toBeNull();
  });
});

test.describe("About page nav, mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the menu drawer locks the page and a section link closes it", async ({ page }) => {
    await page.goto("/about");
    const open = page.getByRole("button", { name: "Open menu" });
    await open.click();

    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await expect(open).toHaveAttribute("aria-expanded", "true");
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");

    await drawer.getByRole("link", { name: "Community" }).click();
    await expect(drawer).toBeHidden();
    await expect(page.locator("#community")).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  });

  test("Escape closes the drawer and returns focus to the menu button", async ({ page }) => {
    await page.goto("/about");
    const open = page.getByRole("button", { name: "Open menu" });
    await open.click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    await expect(open).toBeFocused();
  });
});
