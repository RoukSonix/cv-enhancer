import { test, expect } from "@playwright/test";
import { compressToEncodedURIComponent } from "lz-string";

function buildEncodedShareParam() {
  const payload = {
    v: 1,
    s: 72,
    sm: "Your resume reads like a cover letter for a job you didn't really want.",
    ti: ["No metrics", "Weak verbs", "Missing keywords"],
    as: 60,
    ai: ["Missing keywords"],
    sc: [
      { n: "First Impression", s: 65, r: "Could be better.", t: ["Add a summary"] },
    ],
    rb: [],
  };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

test.describe("OG Image API", () => {
  test("GET /api/og?r= returns PNG for valid encoded param", async ({ request }) => {
    const r = buildEncodedShareParam();
    const response = await request.get(`/api/og?r=${r}`);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("OG image response includes cache-control header", async ({ request }) => {
    const r = buildEncodedShareParam();
    const response = await request.get(`/api/og?r=${r}`);

    expect(response.status()).toBe(200);
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toContain("max-age");
  });

  test("GET /api/og with no params returns fallback PNG (200)", async ({ request }) => {
    const response = await request.get("/api/og");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("GET /api/og?r=invalid returns fallback PNG (200)", async ({ request }) => {
    const response = await request.get("/api/og?r=invalid-garbage");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
});

test.describe("OG Meta Tags", () => {
  test("shared page has og:image meta tag", async ({ page }) => {
    const r = buildEncodedShareParam();
    await page.goto(`/roast?r=${r}`);
    await page.waitForLoadState("domcontentloaded");

    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /\/api\/og/);
  });

  test("shared page has twitter:card summary_large_image", async ({ page }) => {
    const r = buildEncodedShareParam();
    await page.goto(`/roast?r=${r}`);
    await page.waitForLoadState("domcontentloaded");

    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute("content", "summary_large_image");
  });
});

test.describe("Share Buttons", () => {
  test("share buttons are visible on shared results page", async ({ page }) => {
    const r = buildEncodedShareParam();
    await page.goto(`/roast?r=${r}`);
    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId("share-twitter")).toBeVisible();
    await expect(page.getByTestId("share-linkedin")).toBeVisible();
    await expect(page.getByTestId("share-copy-link")).toBeVisible();
  });

  test("Twitter share button opens intent URL", async ({ page, context }) => {
    const r = buildEncodedShareParam();
    await page.goto(`/roast?r=${r}`);
    await expect(page.getByTestId("share-twitter")).toBeVisible({ timeout: 10000 });

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.getByTestId("share-twitter").click(),
    ]);

    expect(popup.url()).toContain("twitter.com/intent/tweet");
    expect(popup.url()).toContain("Score");
    await popup.close();
  });

  test("LinkedIn share button opens share URL", async ({ page, context }) => {
    const r = buildEncodedShareParam();
    await page.goto(`/roast?r=${r}`);
    await expect(page.getByTestId("share-linkedin")).toBeVisible({ timeout: 10000 });

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.getByTestId("share-linkedin").click(),
    ]);

    expect(popup.url()).toContain("linkedin.com/sharing/share-offsite");
    await popup.close();
  });

  test("Copy Link button copies URL and shows toast", async ({ page, context }) => {
    const r = buildEncodedShareParam();
    await page.goto(`/roast?r=${r}`);
    await expect(page.getByTestId("share-copy-link")).toBeVisible({ timeout: 10000 });

    // Grant clipboard permission
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.getByTestId("share-copy-link").click();

    // Button should show "Copied!" text
    await expect(page.getByTestId("share-copy-link")).toContainText("Copied!");

    // Toast should appear
    await expect(page.getByText("Link copied to clipboard!")).toBeVisible();
  });
});
