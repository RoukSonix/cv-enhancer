import { test, expect } from "@playwright/test";

const RESUME_TEXT =
  "John Smith - Software Developer. 5 years experience. " +
  "TechCorp (2020-2025): Worked on various projects, fixed bugs. " +
  "Skills: JavaScript, Python, React, Node.js, AWS. " +
  "Education: BS Computer Science 2018.";

const MOCK_ROAST_RESPONSE = {
  id: "email-test-1234",
  overallScore: 42,
  summary: "Mock roast summary for email capture testing.",
  topIssues: ["Issue 1", "Issue 2", "Issue 3"],
  atsScore: 50,
  atsIssues: ["Missing contact info"],
  sections: [
    { name: "First Impression", score: 40, roast: "Mock roast.", tips: ["Tip 1"] },
  ],
  rewrittenBullets: [],
  email: "test@example.com",
  marketingOptIn: false,
  createdAt: new Date().toISOString(),
};

test.describe("Email Capture", () => {
  test("email input visible on upload form", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder("your@email.com")).toBeVisible();
  });

  test("submit blocked without email (free tier)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await expect(page.getByRole("button", { name: "Roast My Resume" })).toBeDisabled();
  });

  test("invalid email shows inline error", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("your@email.com").fill("notanemail");
    await page.getByPlaceholder("your@email.com").blur();
    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  });

  test("valid email enables submit", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await expect(page.getByRole("button", { name: "Roast My Resume" })).toBeEnabled();
  });

  test("marketing checkbox unchecked by default", async ({ page }) => {
    await page.goto("/");
    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).not.toBeChecked();
  });

  test("GDPR consent text visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("only use your email to deliver your results")
    ).toBeVisible();
  });

  test("email shown on results page", async ({ page }) => {
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

    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Results sent to")).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();
  });

  test("email NOT shown on shared result page", async ({ page }) => {
    // Use a roast ID that would be fetched from DB — mock the server response
    // For the permalink page, the server strips email. We test with the /roast?r= route
    // which uses encoded data (no email in the encoded payload).
    const { compressToEncodedURIComponent } = require("lz-string");
    const payload = {
      v: 1,
      s: 42,
      sm: "Test roast summary.",
      ti: ["Issue 1", "Issue 2", "Issue 3"],
      as: 55,
      ai: ["ATS issue"],
      sc: [{ n: "First Impression", s: 40, r: "Ouch.", t: ["Tip 1"] }],
      rb: [],
    };
    const r = compressToEncodedURIComponent(JSON.stringify(payload));
    await page.goto(`/roast?r=${r}`);

    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Results sent to")).not.toBeVisible();
  });
});
