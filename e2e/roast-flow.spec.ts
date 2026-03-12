import { test, expect } from "@playwright/test";

const RESUME_TEXT =
  "John Smith - Software Developer. 5 years experience. " +
  "TechCorp (2020-2025): Worked on various projects, fixed bugs. " +
  "Skills: JavaScript, Python, React, Node.js, AWS. " +
  "Education: BS Computer Science 2018.";

test.describe("Roast Flow", () => {
  // Single AI call test — covers full flow, share, payments, and reset
  test("full roast lifecycle", async ({ page }) => {
    test.slow(); // AI call can take 30-60s

    // Submit
    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    // Loading state
    await expect(
      page.locator("text=/Firing up|Judging|Counting|Checking|Evaluating|Consulting|Measuring|Scanning/")
    ).toBeVisible({ timeout: 5000 });

    // Wait for results
    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 90000 });

    // Verify result sections
    await expect(page.getByText("Top Issues")).toBeVisible();
    await expect(page.getByText("ATS Compatibility")).toBeVisible();
    await expect(page.getByText("First Impression")).toBeVisible();
    await expect(page.getByText("Want the Full Roast?")).toBeVisible();

    // Share button → toast (clipboard may fail in headless/HTTP, so accept either toast)
    await page.getByRole("button", { name: "Share Results" }).click();
    await expect(page.getByText(/Link copied!|Failed to copy link/)).toBeVisible({ timeout: 5000 });

    // Payment button → coming soon toast
    await page.getByRole("button", { name: /Full Roast.*\$9\.99/ }).click();
    await expect(page.getByText("Coming soon!")).toBeVisible({ timeout: 3000 });

    // Reset
    await page.getByRole("button", { name: "Roast Another", exact: true }).click();
    await expect(page.getByRole("button", { name: "Upload PDF" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Roast My Resume" })).toBeDisabled();
  });
});
