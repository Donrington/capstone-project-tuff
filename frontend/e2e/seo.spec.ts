import { expect, test } from "@playwright/test";

const meta = (page: import("@playwright/test").Page, selector: string) => page.locator(`head ${selector}`).first();

test.describe("search and sharing", () => {
  test("the landing page has a title, a canonical link, a share card and icons", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/^TUFF — Team fitness challenges/);
    await expect(meta(page, 'meta[name="description"]')).toHaveAttribute("content", /team sport/);
    await expect(meta(page, 'link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+$/);
    await expect(meta(page, 'meta[property="og:image"]')).toHaveAttribute("content", /^https?:\/\/.+opengraph-image\.png/);
    await expect(meta(page, 'meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(meta(page, 'link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    await expect(meta(page, 'link[rel="icon"][type="image/png"]')).toHaveAttribute("href", /^\/icon\.png/);
    await expect(meta(page, 'link[rel="apple-touch-icon"]')).toHaveAttribute("href", /^\/apple-icon\.png/);

    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld ?? "{}")["@graph"].map((n: { "@type": string }) => n["@type"])).toEqual(["Organization", "WebSite"]);
  });

  test("a public page with its own title still carries the share image", async ({ page }) => {
    await page.goto("/about");
    await expect(meta(page, 'meta[property="og:title"]')).toHaveAttribute("content", "About");
    await expect(meta(page, 'meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image\.png$/);
    await expect(meta(page, 'meta[name="twitter:image"]')).toHaveAttribute("content", /twitter-image\.png$/);
    await expect(meta(page, 'link[rel="canonical"]')).toHaveAttribute("href", /\/about$/);
  });

  test("pages behind a sign-in say not to index them", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(meta(page, 'meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("robots.txt keeps crawlers out of the app and points at the sitemap", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/^Allow: \/$/m);
    for (const path of ["/dashboard", "/challenges", "/settings", "/onboarding", "/auth/"]) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
    expect(robots).toMatch(/^Sitemap: https?:\/\/.+\/sitemap\.xml$/m);
  });

  test("the sitemap lists the public pages and nothing private", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/about", "/privacy", "/terms"]) expect(xml).toContain(`${path}</loc>`);
    expect(xml).not.toMatch(/\/(dashboard|settings|challenges)/);
  });

  test("the icons, share card and manifest are all served", async ({ request }) => {
    for (const path of ["/favicon.ico", "/icon.png", "/apple-icon.png", "/opengraph-image.png", "/twitter-image.png"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"], path).toMatch(/^image\//);
    }
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.name).toBe("TUFF");
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  });
});
