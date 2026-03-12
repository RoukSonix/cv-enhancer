import { test, expect } from "@playwright/test";

const RESUME_TEXT =
  "John Smith - Software Developer. 5 years experience. " +
  "TechCorp (2020-2025): Worked on various projects, fixed bugs. " +
  "Skills: JavaScript, Python, React, Node.js, AWS. " +
  "Education: BS Computer Science 2018.";

const MOCK_FREE_RESPONSE = {
  id: "free-test-1234",
  overallScore: 38,
  summary: "Mock free roast summary for E2E testing.",
  topIssues: ["Issue 1", "Issue 2", "Issue 3"],
  atsScore: 45,
  atsIssues: ["Missing contact info"],
  sections: [
    { name: "First Impression", score: 35, roast: "Mock free roast.", tips: ["Tip 1"] },
  ],
  rewrittenBullets: [],
  tier: "free",
  createdAt: new Date().toISOString(),
};

const MOCK_PAID_RESPONSE = {
  id: "paid-test-1234",
  overallScore: 65,
  summary: "Detailed paid roast summary with extra analysis and actionable feedback.",
  topIssues: ["Issue 1", "Issue 2", "Issue 3", "Issue 4", "Issue 5"],
  atsScore: 58,
  atsIssues: ["ATS issue 1", "ATS issue 2", "ATS issue 3"],
  sections: [
    { name: "Format & Layout", score: 55, roast: "Your formatting needs serious work.", tips: ["Use consistent margins", "Add clear section headers"] },
    { name: "Work Experience", score: 70, roast: "Decent experience but weak bullet points.", tips: ["Quantify your achievements", "Use strong action verbs"] },
    { name: "Skills & Keywords", score: 60, roast: "Missing critical industry keywords.", tips: ["Add relevant technical keywords", "Match job description terms"] },
    { name: "Education & Certs", score: 75, roast: "Education section is passable.", tips: ["Add relevant coursework", "Include certifications"] },
    { name: "Overall Impact", score: 50, roast: "The overall impact is underwhelming.", tips: ["Lead with your strongest achievements", "Tailor for each application"] },
  ],
  rewrittenBullets: [
    { original: "Did tasks", rewritten: "Led 5 cross-functional projects delivering $2M in revenue", why: "Quantified impact with specific metrics" },
    { original: "Helped team", rewritten: "Mentored 3 junior developers, reducing onboarding time by 40%", why: "Shows leadership and measurable outcomes" },
    { original: "Used tools", rewritten: "Architected CI/CD pipeline reducing deployment time from 2 hours to 15 minutes", why: "Specificity and quantified improvement" },
  ],
  tier: "paid",
  createdAt: new Date().toISOString(),
};

test.describe("Paid Tier UI", () => {
  test("free roast shows Free Roast badge and upsell CTA", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_FREE_RESPONSE),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Free Roast", { exact: true })).toBeVisible();
    await expect(page.getByText("Want the Full Roast?")).toBeVisible();
  });

  test("paid roast shows Full Roast badge", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PAID_RESPONSE),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/?tier=paid");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Full Roast")).toBeVisible();
  });

  test("paid roast shows all 5 section headings", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PAID_RESPONSE),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/?tier=paid");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("Format & Layout")).toBeVisible();
    await expect(page.getByText("Work Experience")).toBeVisible();
    await expect(page.getByText("Skills & Keywords")).toBeVisible();
    await expect(page.getByText("Education & Certs")).toBeVisible();
    await expect(page.getByText("Overall Impact", { exact: true })).toBeVisible();
  });

  test("paid roast shows rewritten bullets section", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PAID_RESPONSE),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/?tier=paid");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Rewritten Bullet Points")).toBeVisible();
    await expect(page.getByText("Did tasks")).toBeVisible();
    await expect(page.getByText(/Led 5 cross-functional/)).toBeVisible();
  });

  test("paid roast does NOT show upsell CTA", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PAID_RESPONSE),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/?tier=paid");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Want the Full Roast?")).not.toBeVisible();
  });

  test("paid roast shows cross-sell buttons", async ({ page }) => {
    await page.route("**/api/roast", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PAID_RESPONSE),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/?tier=paid");
    await page.getByRole("button", { name: "Paste Text" }).click();
    await page.getByPlaceholder("Paste your resume text here").fill(RESUME_TEXT);
    await page.getByRole("button", { name: "Roast My Resume" }).click();

    await expect(page.getByText("Your Resume Score")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Need a better resume?")).toBeVisible();
    await expect(page.getByRole("button", { name: /Template Pack.*\$29/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Professional Rewrite.*\$99/ })).toBeVisible();
  });
});
