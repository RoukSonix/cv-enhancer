import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const FIXTURES_DIR = join(__dirname, "..", "e2e", "fixtures");

async function main() {
  mkdirSync(FIXTURES_DIR, { recursive: true });

  await generateSimpleText();
  await generateMultiColumn();
  await generateMultiPage();
  await generateImageHeavy();
  await generateMinimal();
  await generateEncrypted();
  await generateImageOnly();
  await generateLarge5MB();
  generateCorrupted();
  generateNotAPdf();

  console.log("All test fixtures generated in e2e/fixtures/");
}

async function generateSimpleText() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 740;
  const draw = (text: string, opts?: { bold?: boolean; size?: number }) => {
    page.drawText(text, {
      x: 50,
      y,
      size: opts?.size ?? 11,
      font: opts?.bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
    y -= (opts?.size ?? 11) + 6;
  };

  draw("JANE DOE", { bold: true, size: 18 });
  draw("Software Engineer | jane.doe@email.com | (555) 123-4567 | San Francisco, CA");
  y -= 10;
  draw("PROFESSIONAL SUMMARY", { bold: true, size: 13 });
  draw("Experienced software engineer with 5+ years building scalable web applications.");
  draw("Proficient in TypeScript, React, Node.js, PostgreSQL, and cloud infrastructure.");
  y -= 10;
  draw("WORK EXPERIENCE", { bold: true, size: 13 });
  draw("Senior Software Engineer — TechCorp Inc. (2022 - Present)", { bold: true });
  draw("• Led migration of monolithic API to microservices, reducing latency by 40%");
  draw("• Designed and shipped real-time notification system serving 500K daily users");
  draw("• Mentored 3 junior engineers through structured code review and pair programming");
  y -= 6;
  draw("Software Engineer — StartupCo (2019 - 2022)", { bold: true });
  draw("• Built customer dashboard with React and D3.js, increasing engagement by 25%");
  draw("• Implemented CI/CD pipeline with GitHub Actions, cutting deploy time from 2h to 15m");
  draw("• Wrote comprehensive test suites achieving 92% code coverage");
  y -= 10;
  draw("SKILLS", { bold: true, size: 13 });
  draw("TypeScript, JavaScript, React, Next.js, Node.js, Python, PostgreSQL, Redis, AWS, Docker");
  y -= 10;
  draw("EDUCATION", { bold: true, size: 13 });
  draw("B.S. Computer Science — University of California, Berkeley (2019)");

  const bytes = await doc.save();
  writeFileSync(join(FIXTURES_DIR, "simple-text.pdf"), bytes);
  console.log("  ✓ simple-text.pdf");
}

async function generateMultiColumn() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Left column (sidebar) — contact + skills
  let ly = 740;
  const drawLeft = (text: string, opts?: { bold?: boolean; size?: number }) => {
    page.drawText(text, {
      x: 40,
      y: ly,
      size: opts?.size ?? 10,
      font: opts?.bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
    ly -= (opts?.size ?? 10) + 5;
  };

  drawLeft("CONTACT", { bold: true, size: 12 });
  drawLeft("alex@email.com");
  drawLeft("(555) 987-6543");
  drawLeft("linkedin.com/in/alex");
  drawLeft("github.com/alexdev");
  ly -= 10;
  drawLeft("SKILLS", { bold: true, size: 12 });
  drawLeft("JavaScript");
  drawLeft("TypeScript");
  drawLeft("React / Next.js");
  drawLeft("Node.js");
  drawLeft("Python");
  drawLeft("PostgreSQL");
  drawLeft("Docker / K8s");
  drawLeft("AWS / GCP");
  ly -= 10;
  drawLeft("EDUCATION", { bold: true, size: 12 });
  drawLeft("M.S. Computer Science");
  drawLeft("Stanford University");
  drawLeft("2018");

  // Right column (main) — experience
  let ry = 740;
  const drawRight = (text: string, opts?: { bold?: boolean; size?: number }) => {
    page.drawText(text, {
      x: 240,
      y: ry,
      size: opts?.size ?? 10,
      font: opts?.bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
    ry -= (opts?.size ?? 10) + 5;
  };

  drawRight("ALEX JOHNSON", { bold: true, size: 16 });
  drawRight("Full Stack Engineer", { size: 12 });
  ry -= 10;
  drawRight("EXPERIENCE", { bold: true, size: 12 });
  ry -= 4;
  drawRight("Staff Engineer — BigTech (2021 - Present)", { bold: true });
  drawRight("Architected event-driven platform processing");
  drawRight("10M events/day with 99.99% uptime.");
  drawRight("Led team of 8 across 3 time zones.");
  ry -= 6;
  drawRight("Senior Engineer — MidCo (2018 - 2021)", { bold: true });
  drawRight("Built real-time analytics dashboard");
  drawRight("reducing customer churn by 15%.");
  drawRight("Designed GraphQL API layer serving 200K");
  drawRight("daily active users.");
  ry -= 6;
  drawRight("Software Engineer — StartupX (2016 - 2018)", { bold: true });
  drawRight("Developed payment integration handling");
  drawRight("$50M+ annual transaction volume.");
  drawRight("Implemented automated testing framework");
  drawRight("achieving 95% branch coverage.");

  const bytes = await doc.save();
  writeFileSync(join(FIXTURES_DIR, "multi-column.pdf"), bytes);
  console.log("  ✓ multi-column.pdf");
}

async function generateMultiPage() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const addTextPage = (lines: { text: string; bold?: boolean; size?: number }[]) => {
    const page = doc.addPage([612, 792]);
    let y = 740;
    for (const line of lines) {
      page.drawText(line.text, {
        x: 50,
        y,
        size: line.size ?? 11,
        font: line.bold ? boldFont : font,
        color: rgb(0, 0, 0),
      });
      y -= (line.size ?? 11) + 6;
    }
  };

  // Page 1
  addTextPage([
    { text: "SARAH CHEN", bold: true, size: 18 },
    { text: "Engineering Manager | sarah.chen@email.com | San Jose, CA" },
    { text: "" },
    { text: "PROFESSIONAL SUMMARY", bold: true, size: 13 },
    { text: "Engineering leader with 10+ years of experience building high-performing teams." },
    { text: "Track record of delivering complex distributed systems at scale." },
    { text: "" },
    { text: "WORK EXPERIENCE", bold: true, size: 13 },
    { text: "Engineering Manager — CloudScale (2022 - Present)", bold: true },
    { text: "• Grew team from 4 to 12 engineers while maintaining velocity" },
    { text: "• Delivered real-time data pipeline processing 50TB daily" },
    { text: "• Reduced infrastructure costs by 35% through optimization" },
    { text: "" },
    { text: "Senior Staff Engineer — DataFlow (2019 - 2022)", bold: true },
    { text: "• Designed distributed caching layer reducing p99 latency by 60%" },
    { text: "• Led migration from AWS to hybrid cloud (AWS + GCP)" },
    { text: "• Mentored 6 engineers to senior promotions" },
  ]);

  // Page 2
  addTextPage([
    { text: "WORK EXPERIENCE (continued)", bold: true, size: 13 },
    { text: "Staff Engineer — NetServe (2016 - 2019)", bold: true },
    { text: "• Built API gateway handling 1M requests/minute" },
    { text: "• Implemented zero-downtime deployment pipeline" },
    { text: "• Authored internal RFC process adopted company-wide" },
    { text: "" },
    { text: "Software Engineer — WebStart (2014 - 2016)", bold: true },
    { text: "• Developed real-time collaboration features using WebSockets" },
    { text: "• Reduced page load time from 4.2s to 1.1s" },
    { text: "• Implemented A/B testing framework used across 12 product teams" },
    { text: "" },
    { text: "TECHNICAL SKILLS", bold: true, size: 13 },
    { text: "Languages: TypeScript, Go, Python, Rust, Java" },
    { text: "Infrastructure: AWS, GCP, Kubernetes, Terraform, Docker" },
    { text: "Databases: PostgreSQL, Redis, DynamoDB, Elasticsearch" },
    { text: "Practices: System Design, Distributed Systems, CI/CD, Observability" },
  ]);

  // Page 3
  addTextPage([
    { text: "EDUCATION", bold: true, size: 13 },
    { text: "M.S. Computer Science — MIT (2014)" },
    { text: "Thesis: Fault-tolerant consensus in heterogeneous distributed systems" },
    { text: "B.S. Computer Science — UC San Diego (2012)" },
    { text: "" },
    { text: "CERTIFICATIONS", bold: true, size: 13 },
    { text: "• AWS Solutions Architect Professional" },
    { text: "• Google Cloud Professional Data Engineer" },
    { text: "• Certified Kubernetes Administrator (CKA)" },
    { text: "" },
    { text: "PUBLICATIONS & TALKS", bold: true, size: 13 },
    { text: "• 'Scaling Real-Time Pipelines' — QCon SF 2023" },
    { text: "• 'Zero-Downtime Migrations at Scale' — StrangeLoop 2021" },
    { text: "" },
    { text: "REFERENCES", bold: true, size: 13 },
    { text: "Available upon request." },
  ]);

  const bytes = await doc.save();
  writeFileSync(join(FIXTURES_DIR, "multi-page.pdf"), bytes);
  console.log("  ✓ multi-page.pdf");
}

async function generateImageHeavy() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Background decorative rectangle
  page.drawRectangle({
    x: 0,
    y: 720,
    width: 612,
    height: 72,
    color: rgb(0.15, 0.23, 0.37),
  });

  // Decorative sidebar
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 8,
    height: 720,
    color: rgb(0.15, 0.23, 0.37),
  });

  // "Headshot" placeholder circle
  page.drawCircle({
    x: 80,
    y: 756,
    size: 28,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Name on header
  page.drawText("MICHAEL BROWN", {
    x: 120,
    y: 750,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  page.drawText("DevOps Engineer | michael.b@email.com", {
    x: 120,
    y: 732,
    size: 11,
    font,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Decorative lines
  page.drawLine({
    start: { x: 50, y: 710 },
    end: { x: 562, y: 710 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Content
  let y = 690;
  const draw = (text: string, opts?: { bold?: boolean; size?: number }) => {
    page.drawText(text, {
      x: 50,
      y,
      size: opts?.size ?? 11,
      font: opts?.bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
    y -= (opts?.size ?? 11) + 6;
  };

  draw("SUMMARY", { bold: true, size: 13 });
  draw("DevOps engineer with 7 years automating infrastructure and CI/CD pipelines.");
  draw("Expertise in Kubernetes, Terraform, and cloud-native architecture.");
  y -= 8;

  // More decorative elements
  page.drawRectangle({ x: 50, y: y + 2, width: 512, height: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 8;

  draw("EXPERIENCE", { bold: true, size: 13 });
  draw("Principal DevOps Engineer — InfraCo (2021 - Present)", { bold: true });
  draw("• Managed Kubernetes clusters serving 200+ microservices");
  draw("• Built GitOps workflow with ArgoCD reducing deploy failures by 80%");
  draw("• Implemented comprehensive monitoring with Prometheus + Grafana");
  y -= 6;
  draw("Senior DevOps Engineer — CloudOps (2018 - 2021)", { bold: true });
  draw("• Migrated 50+ services from EC2 to EKS with zero downtime");
  draw("• Designed Terraform modules used across 8 product teams");
  draw("• Reduced cloud spend by $200K/year through right-sizing");
  y -= 8;

  page.drawRectangle({ x: 50, y: y + 2, width: 512, height: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 8;

  draw("SKILLS", { bold: true, size: 13 });
  draw("Kubernetes, Docker, Terraform, Ansible, AWS, GCP, Prometheus, Grafana, ArgoCD, Jenkins");

  // Embed a small PNG (create a minimal 1x1 red pixel PNG)
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  const pngImage = await doc.embedPng(pngHeader);
  page.drawImage(pngImage, { x: 500, y: 400, width: 60, height: 60 });

  const bytes = await doc.save();
  writeFileSync(join(FIXTURES_DIR, "image-heavy.pdf"), bytes);
  console.log("  ✓ image-heavy.pdf");
}

async function generateMinimal() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("John Doe - Software Engineer", {
    x: 50,
    y: 700,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });

  const bytes = await doc.save();
  writeFileSync(join(FIXTURES_DIR, "minimal.pdf"), bytes);
  console.log("  ✓ minimal.pdf");
}

async function generateEncrypted() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 740;
  const draw = (text: string, opts?: { bold?: boolean; size?: number }) => {
    page.drawText(text, {
      x: 50,
      y,
      size: opts?.size ?? 11,
      font: opts?.bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
    y -= (opts?.size ?? 11) + 6;
  };

  draw("JANE DOE", { bold: true, size: 18 });
  draw("Software Engineer | jane.doe@email.com | San Francisco, CA");
  draw("Experienced software engineer with 5+ years in web development.");
  draw("Proficient in TypeScript, React, Node.js, PostgreSQL.");

  // pdf-lib supports encryption via save options
  const bytes = await doc.save({
    userPassword: "test123",
    ownerPassword: "owner456",
  });
  writeFileSync(join(FIXTURES_DIR, "encrypted.pdf"), bytes);
  console.log("  ✓ encrypted.pdf");
}

async function generateImageOnly() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);

  // Create a larger PNG to simulate a scanned resume (no text objects in PDF)
  // We'll just embed the minimal PNG scaled to full page — no text layer
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const pngImage = await doc.embedPng(pngHeader);
  // Draw the image full-page — there is NO text layer
  page.drawImage(pngImage, { x: 0, y: 0, width: 612, height: 792 });

  const bytes = await doc.save();
  writeFileSync(join(FIXTURES_DIR, "image-only.pdf"), bytes);
  console.log("  ✓ image-only.pdf");
}

async function generateLarge5MB() {
  // Create a valid PDF, save it, then pad the file to >5MB
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText("This PDF is padded to exceed 5MB for size testing.", {
    x: 50,
    y: 700,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await doc.save();
  // Pad to just over 5MB by appending PDF comments (valid PDF allows trailing data)
  const targetSize = 5.2 * 1024 * 1024;
  const padding = Buffer.alloc(targetSize - pdfBytes.length);
  // Fill with repeating PDF comment lines so it stays a structurally valid PDF
  const commentLine = Buffer.from("% padding line for size test\n");
  for (let i = 0; i < padding.length; i++) {
    padding[i] = commentLine[i % commentLine.length];
  }
  const finalBytes = Buffer.concat([Buffer.from(pdfBytes), padding]);
  writeFileSync(join(FIXTURES_DIR, "large-5mb.pdf"), finalBytes);
  console.log(`  ✓ large-5mb.pdf (${(finalBytes.length / 1024 / 1024).toFixed(1)}MB)`);
}

function generateCorrupted() {
  // Random bytes — not a valid PDF
  const bytes = Buffer.alloc(1024);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  writeFileSync(join(FIXTURES_DIR, "corrupted.bin"), bytes);
  console.log("  ✓ corrupted.bin");
}

function generateNotAPdf() {
  writeFileSync(
    join(FIXTURES_DIR, "not-a-pdf.txt"),
    "This is a plain text file, not a PDF.\n"
  );
  console.log("  ✓ not-a-pdf.txt");
}

main().catch((err) => {
  console.error("Failed to generate fixtures:", err);
  process.exit(1);
});
