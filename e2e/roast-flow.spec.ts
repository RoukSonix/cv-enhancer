import { test, expect } from "@playwright/test";

const RESUME_TEXT =
  "John Smith - Software Developer. 5 years experience. " +
  "TechCorp (2020-2025): Worked on various projects, fixed bugs. " +
  "Skills: JavaScript, Python, React, Node.js, AWS. " +
  "Education: BS Computer Science 2018.";

const MOCK_ROAST_RESPONSE = {
  id: "test12345678",
  overallScore: 38,
  summary: "Mock roast summary for E2E testing.",
  topIssues: ["Issue 1", "Issue 2", "Issue 3"],
  atsScore: 45,
  atsIssues: ["Missing contact info"],
  sections: [
    { name: "First Impression", score: 35, roast: "Mock roast.", tips: ["Tip 1"] },
  ],
  rewrittenBullets: [],
  createdAt: new Date().toISOString(),
};

test.describe("Roast Flow", () => {
  test("full roast lifecycle (mocked API)", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_ROAST_RESPONSE),
        });
      } else {
        route.continue();
      }
    });

    // Submit
    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    // Wait for results
    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 15000 });

    // Verify result sections
    await expect(page.getByText("Top Issues")).toBeVisible();
    await expect(page.getByText("ATS Compatibility")).toBeVisible();
    await expect(page.getByText("First Impression")).toBeVisible();
    await expect(page.getByText("Want the Full Roast?")).toBeVisible();

    // Verify payment button exists (wired to Stripe now, not "Coming soon")
    await expect(page.getByRole("button", { name: /Full Roast.*\$9\.99/ })).toBeVisible();

    // Share button → toast
    await page.getByRole("button", { name: "Share Results" }).click();
    await expect(page.getByText(/Link copied!|Failed to copy link/)).toBeVisible({ timeout: 5000 });

    // Reset
    await page.getByRole("button", { name: "Roast Another", exact: true }).click();
    await expect(page.getByRole("button", { name: "Upload PDF" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Roast My Resume" })).toBeDisabled();
  });
});
