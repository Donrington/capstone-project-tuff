import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { siteConfig } from "../lib/site-config";

test.describe("About page footer", () => {
  test("has the footer landmarks, contact and legal links", async ({ page }) => {
    await page.goto("/about");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    await expect(footer.getByRole("navigation", { name: "Footer" }).getByRole("link")).toHaveText([
      "Dashboard",
      "Challenges",
      "Leaderboard",
      "Teams",
    ]);
    await expect(footer.locator('address a[href^="mailto:"]')).toHaveText(siteConfig.email);
    await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    await expect(footer).toContainText(`© ${new Date().getFullYear()} ${siteConfig.name}`);
  });

  test("social links are labelled and open in a new tab safely", async ({ page }) => {
    await page.goto("/about");
    const socials = page.getByRole("list", { name: "TUFF on social media" }).getByRole("link");
    await expect(socials).toHaveCount(siteConfig.socials.length);
    for (const link of await socials.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link).toHaveAttribute("aria-label", /\(opens in a new tab\)$/);
    }
  });

  test("the logo is decorative and spans the card's inner width", async ({ page }) => {
    await page.goto("/about");
    const logo = page.locator('footer div[aria-hidden="true"]');
    await expect(logo).toHaveCount(1);
    const { logoWidth, innerWidth } = await logo.evaluate((el) => {
      const card = el.parentElement!;
      const style = getComputedStyle(card);
      return {
        logoWidth: el.getBoundingClientRect().width,
        innerWidth: card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      };
    });
    expect(Math.abs(logoWidth - innerWidth)).toBeLessThan(1);
  });

  test("keyboard order runs links, socials, email, then legal", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Dashboard" }).focus();
    const order: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      order.push(
        await page.evaluate(
          () => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? "",
        ),
      );
    }
    expect(order).toEqual([
      "Challenges",
      "Leaderboard",
      "Teams",
      ...siteConfig.socials.map((s) => `${s.label} (opens in a new tab)`),
      siteConfig.email,
      "Privacy",
      "Terms",
    ]);
  });

  test("axe finds no accessibility issues in the footer", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page }).include("footer").analyze();
    expect(results.violations).toEqual([]);
  });

  test("no horizontal scroll at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/about");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test("appears on the About page only", async ({ page }) => {
    for (const path of ["/", "/dashboard", "/terms"]) {
      await page.goto(path);
      await expect(page.getByRole("contentinfo")).toHaveCount(0);
    }
  });
});
