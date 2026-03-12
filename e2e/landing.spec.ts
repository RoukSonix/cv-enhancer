import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Getting Roasted");
    await expect(page.getByText("AI-Powered Resume Critique", { exact: true })).toBeVisible();
  });

  test("shows upload and paste tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Upload PDF" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Paste Text" })).toBeVisible();
  });

  test("roast button is disabled when no input", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Roast My Resume" })).toBeDisabled();
  });

  test("roast button enables after pasting text and email", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill("Test resume content for validation.");
    // Button still disabled without email (free tier)
    await expect(page.getByRole("button", { name: "Roast My Resume" })).toBeDisabled();
    // Fill email to enable
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await expect(page.getByRole("button", { name: "Roast My Resume" })).toBeEnabled();
  });

  test("shows honest social proof (no fake numbers)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Free instant feedback")).toBeVisible();
    await expect(page.getByText("No signup required")).toBeVisible();
  });
});
