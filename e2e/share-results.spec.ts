import { test, expect } from "@playwright/test";
import { compressToEncodedURIComponent } from "lz-string";

function buildEncodedShareParam() {
  // Minimal SharePayload (v:1) to render a page without hitting the AI endpoint
  const payload = {
    v: 1,
    s: 42,
    sm: "Test roast summary for shared page.",
    ti: ["Issue 1", "Issue 2", "Issue 3"],
    as: 55,
    ai: ["ATS issue"],
    sc: [
      {
        n: "First Impression",
        s: 40,
        r: "Ouch.",
        t: ["Tip 1", "Tip 2"],
      },
    ],
    rb: [],
  };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

test.describe("Share Results (/roast)", () => {
  test("shared URL renders results page (no AI call)", async ({ page }) => {
    const r = buildEncodedShareParam();
    await page.goto(`/roast?r=${r}`);

    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Top Issues")).toBeVisible();
    await expect(page.getByText("ATS Compatibility")).toBeVisible();
  });

  test("invalid share URL shows error page", async ({ page }) => {
    await page.goto("/roast?r=invalid-data");
    await expect(page.getByText(/invalid|expired/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: /roast/i }).first()).toBeVisible();
  });

  test("missing r param shows error page", async ({ page }) => {
    await page.goto("/roast");
    await expect(page.getByText(/no results/i)).toBeVisible({ timeout: 10000 });
  });
});
