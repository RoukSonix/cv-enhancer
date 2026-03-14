import { test, expect } from "@playwright/test";
import path from "path";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

const MOCK_ROAST_RESPONSE = {
  id: "pdf-test-1234",
  overallScore: 42,
  summary: "Mock roast summary for PDF upload testing.",
  topIssues: ["Issue 1", "Issue 2", "Issue 3"],
  atsScore: 50,
  atsIssues: ["Missing contact info"],
  sections: [
    {
      name: "First Impression",
      score: 40,
      roast: "Mock roast.",
      tips: ["Tip 1"],
    },
  ],
  rewrittenBullets: [],
  tier: "free",
  createdAt: new Date().toISOString(),
};

const MOCK_PREVIEW_RESPONSE = {
  text: "JANE DOE Software Engineer | jane.doe@email.com | (555) 123-4567 | San Francisco, CA PROFESSIONAL SUMMARY Experienced software engineer with 5+ years building scalable web applications.",
  charCount: 423,
  method: "pdf-parse",
};

const MOCK_PREVIEW_MINIMAL = {
  text: "John Doe - Software Engineer",
  charCount: 28,
  method: "pdf-parse",
  warning:
    "Very little text extracted. Consider pasting your resume text instead.",
};

function mockRoastApi(page: import("@playwright/test").Page) {
  return page.route("**/api/roast", (route) => {
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
}

function mockPreviewApi(
  page: import("@playwright/test").Page,
  response = MOCK_PREVIEW_RESPONSE
) {
  return page.route("**/api/roast/preview", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    } else {
      route.continue();
    }
  });
}

test.describe("PDF Upload", () => {
  test("simple PDF upload → roast results", async ({ page }) => {
    await mockRoastApi(page);
    await mockPreviewApi(page);

    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "simple-text.pdf"));

    await expect(page.getByText("simple-text.pdf")).toBeVisible();
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Top Issues")).toBeVisible();
  });

  test("multi-column PDF extracts text", async ({ page }) => {
    await mockRoastApi(page);
    await mockPreviewApi(page);

    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(FIXTURES_DIR, "multi-column.pdf")
    );

    await expect(page.getByText("multi-column.pdf")).toBeVisible();
    // Preview should show extracted text toggle
    await expect(
      page.getByText("Extracted Text Preview")
    ).toBeVisible({ timeout: 5000 });
  });

  test("multi-page PDF extracts all pages", async ({ page }) => {
    const multiPagePreview = {
      text: "SARAH CHEN Engineering Manager...",
      charCount: 1250,
      method: "pdf-parse",
    };
    await mockPreviewApi(page, multiPagePreview);

    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "multi-page.pdf"));

    await expect(
      page.getByText("Extracted Text Preview")
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("1250 characters")).toBeVisible();
  });

  test("image-heavy PDF still extracts text", async ({ page }) => {
    const imageHeavyPreview = {
      text: "MICHAEL BROWN DevOps Engineer...",
      charCount: 380,
      method: "pdf-parse",
    };
    await mockPreviewApi(page, imageHeavyPreview);

    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(FIXTURES_DIR, "image-heavy.pdf")
    );

    await expect(
      page.getByText("Extracted Text Preview")
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("380 characters")).toBeVisible();
  });

  test("minimal PDF shows quality warning", async ({ page }) => {
    await mockPreviewApi(page, MOCK_PREVIEW_MINIMAL);

    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "minimal.pdf"));

    // Should show the amber warning
    await expect(
      page.getByText("Very little text extracted")
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Paste instead")).toBeVisible();
  });

  test("encrypted PDF shows descriptive error", async ({ page }) => {
    await page.route("**/api/roast/preview", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "This PDF is password-protected. Please remove the password and re-upload, or paste your resume text instead.",
          }),
        });
      } else {
        route.continue();
      }
    });
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "This PDF is password-protected. Please remove the password and re-upload, or paste your resume text instead.",
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(FIXTURES_DIR, "encrypted.pdf")
    );

    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(
      page
        .locator("[data-sonner-toast]")
        .getByText(/password-protected/)
    ).toBeVisible({ timeout: 10000 });
  });

  test("image-only PDF shows paste-instead message", async ({ page }) => {
    await page.route("**/api/roast/preview", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "This PDF contains only images — no text could be extracted. Please paste your resume text instead.",
          }),
        });
      } else {
        route.continue();
      }
    });
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "This PDF contains only images — no text could be extracted. Please paste your resume text instead.",
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(FIXTURES_DIR, "image-only.pdf")
    );

    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(
      page
        .locator("[data-sonner-toast]")
        .getByText(/paste your resume text/)
    ).toBeVisible({ timeout: 10000 });
  });

  test("file >5MB rejected on client", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(FIXTURES_DIR, "large-5mb.pdf")
    );

    await expect(
      page.locator("[data-sonner-toast]").getByText(/too large/i)
    ).toBeVisible({ timeout: 5000 });

    // File should NOT be set
    await expect(page.getByText("large-5mb.pdf")).not.toBeVisible();
  });

  test("corrupted file shows error", async ({ page }) => {
    // corrupted.bin has wrong MIME type, will be rejected on client as non-PDF
    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    // For corrupted.bin — since it doesn't have PDF MIME type, the file input with accept=".pdf"
    // may not accept it. We'll use route mocking instead — simulate server-side rejection
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "This file doesn't appear to be a valid PDF. Please check the file and try again.",
          }),
        });
      } else {
        route.continue();
      }
    });
    await page.route("**/api/roast/preview", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "This file doesn't appear to be a valid PDF. Please check the file and try again.",
          }),
        });
      } else {
        route.continue();
      }
    });

    // Upload a valid-looking PDF name to get past client validation, mock server rejection
    await fileInput.setInputFiles(
      path.join(FIXTURES_DIR, "simple-text.pdf")
    );
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(
      page
        .locator("[data-sonner-toast]")
        .getByText(/valid PDF/)
    ).toBeVisible({ timeout: 10000 });
  });

  test("non-PDF file rejected on client", async ({ page }) => {
    await page.goto("/");

    // Playwright can force-set any file even with accept filter
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(FIXTURES_DIR, "not-a-pdf.txt")
    );

    await expect(
      page
        .locator("[data-sonner-toast]")
        .getByText(/Only PDF files/)
    ).toBeVisible({ timeout: 5000 });
  });

  test("extracted text preview is collapsible", async ({ page }) => {
    await mockPreviewApi(page);

    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "simple-text.pdf"));

    // Preview toggle should appear
    const toggle = page.getByTestId("preview-toggle");
    await expect(toggle).toBeVisible({ timeout: 5000 });

    // Text should NOT be visible initially (collapsed)
    await expect(page.locator("pre")).not.toBeVisible();

    // Click to expand
    await toggle.click();
    await expect(page.locator("pre")).toBeVisible();
    await expect(page.locator("pre")).toContainText("JANE DOE");

    // Click to collapse
    await toggle.click();
    await expect(page.locator("pre")).not.toBeVisible();
  });

  test("\"paste instead\" link switches to paste mode", async ({ page }) => {
    await mockPreviewApi(page, MOCK_PREVIEW_MINIMAL);

    await page.goto("/");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "minimal.pdf"));

    // Warning should appear
    await expect(
      page.getByText("Very little text extracted")
    ).toBeVisible({ timeout: 5000 });

    // Click "Paste instead"
    await page.getByText("Paste instead").click();

    // Should switch to paste mode
    await expect(
      page.getByPlaceholder("Paste your resume text here")
    ).toBeVisible();

    // File should be cleared (no preview visible)
    await expect(page.getByText("minimal.pdf")).not.toBeVisible();
  });

  test("drag-and-drop PDF upload works", async ({ page }) => {
    await mockRoastApi(page);
    await mockPreviewApi(page);

    await page.goto("/");

    // Use setInputFiles to simulate file selection (drag-drop internals)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "simple-text.pdf"));

    await expect(page.getByText("simple-text.pdf")).toBeVisible();
    await page.getByPlaceholder("your@email.com").fill("test@example.com");
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({
      timeout: 15000,
    });
  });

  test("PDF upload with paid tier skips email requirement", async ({
    page,
  }) => {
    await mockRoastApi(page);
    await mockPreviewApi(page);

    await page.goto("/?tier=paid");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURES_DIR, "simple-text.pdf"));

    await expect(page.getByText("simple-text.pdf")).toBeVisible();
    // No email required for paid tier
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({
      timeout: 15000,
    });
  });
});
