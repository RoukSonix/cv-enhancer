import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const RESUME_TEXT =
  "John Smith - Software Developer. 5 years experience. " +
  "TechCorp (2020-2025): Worked on various projects, fixed bugs. " +
  "Skills: JavaScript, Python, React, Node.js, AWS. " +
  "Education: BS Computer Science 2018.";

const MOCK_ROAST_RESPONSE = {
  id: "err-test-1234",
  overallScore: 42,
  summary: "Mock roast summary for error handling testing.",
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

test.describe("Error Handling", () => {
  test("API error shows toast, not inline text", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
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

    // Toast should appear
    await expect(
      page.locator("[data-sonner-toast]").getByText("Internal server error")
    ).toBeVisible({ timeout: 10000 });

    // No inline error text (destructive styled paragraphs)
    await expect(page.locator("p.text-destructive")).not.toBeVisible();
  });

  test("file name and size displayed after valid PDF upload", async ({ page }) => {
    await page.goto("/");

    // Create a small fake PDF file for testing
    const tmpDir = path.join(__dirname, ".tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const pdfPath = path.join(tmpDir, "test-resume.pdf");
    // Minimal PDF header to pass type detection
    fs.writeFileSync(pdfPath, "%PDF-1.4 test content for file size display");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pdfPath);

    await expect(page.getByText("test-resume.pdf")).toBeVisible();
    // File size should be displayed
    await expect(page.getByText(/\d+(\.\d+)?\s*(B|KB|MB)/)).toBeVisible();

    // Cleanup
    fs.unlinkSync(pdfPath);
    fs.rmdirSync(tmpDir);
  });

  test("no inline error text elements on upload page", async ({ page }) => {
    await page.goto("/");
    // There should be no .text-destructive elements on the initial page
    await expect(page.locator("p.text-destructive")).toHaveCount(0);
  });

  test("timeout shows retry UI with try again button", async ({ page }) => {
    // Mock a very slow API response that will trigger the 30s timeout
    // We use a shorter approach: abort the route to simulate timeout behavior
    await page.route("**/api/roast", async (route) => {
      if (route.request().method() === "POST") {
        // Never respond — let the AbortController timeout fire
        await new Promise(() => {}); // hang forever
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    // Wait for the timeout UI (30s + buffer)
    await expect(
      page.getByText("The roast is taking longer than expected")
    ).toBeVisible({ timeout: 40000 });

    // Try Again button should be visible
    await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();

    // Change resume button should be visible
    await expect(page.getByRole("button", { name: "Change resume" })).toBeVisible();
  });

  test("change resume button returns to form after timeout", async ({ page }) => {
    await page.route("**/api/roast", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise(() => {}); // hang forever
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(
      page.getByText("The roast is taking longer than expected")
    ).toBeVisible({ timeout: 40000 });

    await page.getByRole("button", { name: "Change resume" }).click();

    // Should return to the upload form
    await expect(page.getByRole("button", { name: "Roast My Resume" })).toBeVisible();
  });

  test("network error shows toast", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.abort("failed");
      } else {
        route.continue();
      }
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(
      page.locator("[data-sonner-toast]").getByText(/Network error|timed out/)
    ).toBeVisible({ timeout: 10000 });
  });

  test("submit button re-enabled after error", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Server error" }),
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

    // Wait for error toast
    await expect(
      page.locator("[data-sonner-toast]").getByText("Server error")
    ).toBeVisible({ timeout: 10000 });

    // Button should be re-enabled (form state preserved)
    await expect(page.getByRole("button", { name: "Roast My Resume" })).toBeEnabled({ timeout: 5000 });
  });
});
