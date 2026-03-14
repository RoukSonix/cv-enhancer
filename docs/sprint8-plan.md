# Sprint 8: PDF Upload E2E Testing — Implementation Plan

**Created:** 2026-03-14
**Sprint goal:** Ensure PDF upload works reliably with various resume formats; add pdf.js fallback, text quality check, and extracted text preview
**Branch:** `feat/pdf-upload-e2e-testing`

---

## 1. Files to Create

| File | Purpose |
|------|---------|
| `e2e/fixtures/simple-text.pdf` | Test PDF: single-page, clean text, standard layout |
| `e2e/fixtures/multi-column.pdf` | Test PDF: two-column layout (common modern resume format) |
| `e2e/fixtures/multi-page.pdf` | Test PDF: 3-page resume with section breaks |
| `e2e/fixtures/image-heavy.pdf` | Test PDF: includes headshot, icons, background graphics |
| `e2e/fixtures/minimal.pdf` | Test PDF: very sparse content (name + 1 job, ~40 chars extracted) |
| `e2e/fixtures/encrypted.pdf` | Test PDF: password-protected PDF |
| `e2e/fixtures/image-only.pdf` | Test PDF: scanned resume — all text is in images, no extractable text layer |
| `e2e/fixtures/large-5mb.pdf` | Test PDF: just over 5MB to test size rejection |
| `e2e/fixtures/corrupted.bin` | Test file: random bytes renamed to .pdf — invalid PDF |
| `e2e/fixtures/not-a-pdf.txt` | Test file: plain text file (wrong MIME type) |
| `scripts/generate-test-pdfs.ts` | Script to generate all test fixture PDFs programmatically |
| `e2e/pdf-upload.spec.ts` | E2E tests for PDF upload flow (14 tests) |
| `src/lib/__tests__/pdf-extraction.test.ts` | Unit tests for PDF extraction + fallback logic |
| `src/lib/pdf-fallback.ts` | pdf.js fallback extraction when pdf-parse fails |
| `src/components/ExtractedTextPreview.tsx` | Collapsible preview of extracted text before roasting |

## 2. Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/roast/route.ts` | Add pdf.js fallback in `extractTextFromPdf()`, improve error messages for encrypted/image-only/corrupted PDFs |
| `src/components/ResumeUpload.tsx` | Add extracted text preview (collapsible), text quality warning UI, two-step flow: upload → preview → roast |
| `src/lib/file-validation.ts` | No changes needed (validation already handles type + size) |
| `package.json` | Add `pdfjs-dist` dependency for pdf.js fallback |
| `e2e/tsconfig.json` | Add if needed for fixture script imports |

---

## 3. Test Fixture Descriptions

### How to Generate

Use `scripts/generate-test-pdfs.ts` with the `pdf-lib` package (dev dependency) to programmatically create fixtures. This avoids committing real resumes and ensures reproducible test data.

```bash
npx tsx scripts/generate-test-pdfs.ts
```

### Fixture Specifications

| # | Fixture | File | Size | Content | Purpose |
|---|---------|------|------|---------|---------|
| 1 | Simple text | `simple-text.pdf` | ~20KB | Single page, standard resume: name, contact, 2 jobs, skills, education. Clean text flow. | Happy path — baseline PDF that must always work |
| 2 | Multi-column | `multi-column.pdf` | ~30KB | Two-column layout: left sidebar (contact, skills), right main (experience, education). Text boxes positioned with x/y coords. | Tests column extraction ordering — pdf-parse may interleave columns |
| 3 | Multi-page | `multi-page.pdf` | ~50KB | 3 pages: page 1 (header + 2 jobs), page 2 (2 more jobs + skills), page 3 (education + certifications + references). | Tests cross-page text concatenation |
| 4 | Image-heavy | `image-heavy.pdf` | ~200KB | Standard text content BUT with embedded PNG (headshot), decorative lines, and background rectangles. Text is still extractable. | Tests that extraction works when non-text elements are present |
| 5 | Minimal | `minimal.pdf` | ~5KB | Just a name and one line: "John Doe - Software Engineer". Extracted text < 50 chars. | Triggers the "text too short" quality warning |
| 6 | Encrypted | `encrypted.pdf` | ~20KB | Same content as simple-text but encrypted with user password "test123". | Tests graceful error handling for password-protected PDFs |
| 7 | Image-only | `image-only.pdf` | ~150KB | A rasterized image of resume text (PNG embedded as full-page image). No text layer at all. | Tests fallback path — no text extractable by any parser |
| 8 | Large (>5MB) | `large-5mb.pdf` | ~5.1MB | Padded PDF with embedded large image to push over 5MB limit. | Tests client + server size rejection |
| 9 | Corrupted | `corrupted.bin` | ~1KB | Random bytes with `.pdf` extension. Not a valid PDF. | Tests graceful handling of invalid PDF structure |
| 10 | Wrong type | `not-a-pdf.txt` | ~100B | Plain text file. | Tests MIME type rejection on client |

### Generation Script Design (`scripts/generate-test-pdfs.ts`)

```
Dependencies: pdf-lib (creates PDFs programmatically)

For each fixture:
1. Create PDFDocument
2. Add pages with appropriate content
3. For encrypted: use PDFDocument.encrypt()
4. For image-only: embed a rasterized PNG of text (no text objects)
5. For large: embed a ~5MB dummy PNG
6. For corrupted: write random bytes directly
7. Save all to e2e/fixtures/
```

---

## 4. pdf.js Fallback Implementation

### Problem

`pdf-parse` (v2.x) fails silently or throws on certain PDF structures:
- Encrypted PDFs → throws `PasswordException`
- Some multi-column PDFs → returns garbled/interleaved text
- PDFs with unusual font encodings → returns empty or garbage text

### Solution: `src/lib/pdf-fallback.ts`

```
Strategy: Try pdf-parse first, fall back to pdfjs-dist if it fails or returns insufficient text.

Flow:
1. Try pdf-parse (existing code)
2. If throws → catch, try pdfjs-dist
3. If returns text < 50 chars → try pdfjs-dist as fallback
4. If both fail → return descriptive error

pdfjs-dist setup:
- Import: import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
- No worker needed for server-side Node.js extraction
- Use getDocument({ data: uint8Array }) → getPage() → getTextContent()
- Concatenate all page text items
```

### `extractTextFromPdf` Refactored Flow (in route.ts)

```
async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; method: 'pdf-parse' | 'pdfjs' }> {
  // Attempt 1: pdf-parse
  try {
    const text = await extractWithPdfParse(buffer);
    if (text.trim().length >= 50) {
      return { text, method: 'pdf-parse' };
    }
    // Text too short — fall through to pdfjs
  } catch (err) {
    // pdf-parse failed — fall through to pdfjs
    console.warn('pdf-parse failed, trying pdfjs fallback:', err.message);
  }

  // Attempt 2: pdfjs-dist
  try {
    const text = await extractWithPdfJs(buffer);
    return { text, method: 'pdfjs' };
  } catch (err) {
    console.warn('pdfjs fallback also failed:', err.message);
  }

  // Both failed
  throw new PdfExtractionError('Could not extract text from this PDF. It may be encrypted, image-only, or corrupted.');
}
```

### Error Classification

| PDF Type | pdf-parse Behavior | pdfjs Behavior | User-Facing Error |
|----------|-------------------|----------------|-------------------|
| Encrypted | Throws `PasswordException` | Throws `PasswordRequired` | "This PDF is password-protected. Please remove the password and re-upload, or paste your resume text instead." |
| Image-only | Returns empty string | Returns empty string | "This PDF contains only images — no text could be extracted. Please paste your resume text instead." |
| Corrupted | Throws parse error | Throws `InvalidPDFException` | "This file doesn't appear to be a valid PDF. Please check the file and try again." |
| Normal | Works | Works | N/A |

### Dependency

```bash
npm install pdfjs-dist
```

Use `pdfjs-dist/legacy/build/pdf.mjs` for Node.js compatibility (no canvas/DOM dependency). Version should match what works with Node 22.

---

## 5. Text Extraction Quality Check

### Problem

Some PDFs yield extractable text that is too short, garbled, or incomplete to produce a useful roast. The current API already rejects text < 50 chars, but the user gets a generic error after waiting for upload + processing.

### Solution: Preview Endpoint + Better Server Errors

After PDF upload and before clicking "Roast My Resume", extract text server-side via a new lightweight endpoint (`POST /api/roast/preview`) and show a collapsible preview. The existing API error messages for short/empty text are also improved.

### Server-Side Quality Check with Better Errors

The existing API already checks `resumeText.trim().length < 50`. Enhance this:

```
In route.ts POST handler, after extraction:

if (resumeText.trim().length === 0) {
  return 400: "No text could be extracted from this PDF. It may be a scanned document (image-only). Please paste your resume text instead."
}

if (resumeText.trim().length < 50) {
  return 400: "Very little text was extracted from this PDF (only X characters). The resume may be image-based or use an unusual format. Please paste your resume text instead."
}
```

### Client-Side: Extracted Text Preview (Collapsible)

Add a two-step upload flow for PDFs:

```
Step 1: User uploads PDF → client sends to POST /api/roast/preview (new lightweight endpoint)
Step 2: Server extracts text, returns { text, charCount, method }
Step 3: Client shows collapsible preview of extracted text
Step 4: If charCount < 50 → show warning banner: "Very little text extracted. Consider pasting instead."
Step 5: User clicks "Roast My Resume" to proceed (or switches to paste mode)
```

### New Endpoint: `POST /api/roast/preview`

```
Request: FormData with 'resume' (PDF file)
Response: {
  text: string,         // First 500 chars of extracted text
  charCount: number,    // Total character count
  method: 'pdf-parse' | 'pdfjs',  // Which parser succeeded
  warning?: string      // Optional warning message
}

- No AI call, no DB write — just extraction
- Same file validation as /api/roast (size, type)
- Returns quickly (<1s for most PDFs)
```

### `src/components/ExtractedTextPreview.tsx`

```
Props: {
  text: string;
  charCount: number;
  warning?: string;
  onPasteInstead: () => void;
}

Renders:
- Collapsible section: "Extracted Text Preview" with chevron toggle
- Shows first 500 chars of extracted text in a monospace pre block
- Character count badge: "423 characters extracted"
- If warning → amber warning banner with "Paste instead" link
- Collapsed by default, expandable on click
```

### Integration in `ResumeUpload.tsx`

```
New state:
- extractedPreview: { text: string, charCount: number, warning?: string } | null

Flow change:
1. User uploads file → setFile(f) (existing)
2. Immediately POST to /api/roast/preview with the file
3. On response → setExtractedPreview(data)
4. Show ExtractedTextPreview component below the drop zone
5. If warning present → show amber banner
6. Submit button behavior unchanged — still sends to /api/roast

IMPORTANT: Preview fetch must fail gracefully (silent catch, no error toast).
If /api/roast/preview returns an error or 404, simply don't show the preview.
The preview is informational only — upload + roast flow must work without it.
This prevents breaking existing E2E tests that upload PDFs without mocking the preview endpoint.
```

---

## 6. Files to Modify — Detailed Changes

### `src/app/api/roast/route.ts`

1. Replace `extractTextFromPdf()` with the dual-parser version from `src/lib/pdf-fallback.ts`
2. Improve error messages for < 50 char case (include char count)
3. Catch specific PDF errors (encrypted, corrupted) and return descriptive 400 responses
4. Log which parser method succeeded for observability

### `src/components/ResumeUpload.tsx`

1. Add `extractedPreview` state
2. After file selection, POST to `/api/roast/preview`
3. Render `<ExtractedTextPreview>` between the drop zone and the email section
4. Add "Paste instead" handler that switches mode and clears file
5. Show loading spinner during preview extraction

### New: `POST /api/roast/preview` route (`src/app/api/roast/preview/route.ts`)

1. Accept FormData with PDF file
2. Validate file (size, type)
3. Extract text using the same dual-parser logic
4. Return preview (first 500 chars), total char count, parser method, optional warning
5. No AI, no DB — fast endpoint

---

## 7. E2E Test Cases (14 tests)

### `e2e/pdf-upload.spec.ts`

| # | Test Name | Description | Fixture | Mock API? |
|---|-----------|-------------|---------|-----------|
| 1 | `simple PDF upload → roast results` | Upload simple-text.pdf, fill email, submit → results displayed | `simple-text.pdf` | Yes (mock /api/roast) |
| 2 | `multi-column PDF extracts text` | Upload multi-column.pdf → preview shows extracted text | `multi-column.pdf` | Yes (mock /api/roast/preview + /api/roast) |
| 3 | `multi-page PDF extracts all pages` | Upload multi-page.pdf → preview charCount is substantial (>200) | `multi-page.pdf` | Yes (mock /api/roast/preview) |
| 4 | `image-heavy PDF still extracts text` | Upload image-heavy.pdf → preview shows extracted text (not empty) | `image-heavy.pdf` | Yes (mock /api/roast/preview) |
| 5 | `minimal PDF shows quality warning` | Upload minimal.pdf → preview shows amber warning banner | `minimal.pdf` | Yes (mock /api/roast/preview with warning) |
| 6 | `encrypted PDF shows descriptive error` | Upload encrypted.pdf → submit → toast shows password-protected message | `encrypted.pdf` | Yes (mock /api/roast with 400) |
| 7 | `image-only PDF shows paste-instead message` | Upload image-only.pdf → preview/submit → error tells user to paste instead | `image-only.pdf` | Yes (mock with 400) |
| 8 | `file >5MB rejected on client` | Select large-5mb.pdf → toast "File too large", file not set | `large-5mb.pdf` | No (client-side rejection) |
| 9 | `corrupted file shows error` | Upload corrupted.bin → submit → toast shows invalid PDF message | `corrupted.bin` | Yes (mock /api/roast with 400) |
| 10 | `non-PDF file rejected on client` | Select not-a-pdf.txt → toast "Only PDF files are accepted" | `not-a-pdf.txt` | No (client-side rejection) |
| 11 | `extracted text preview is collapsible` | Upload valid PDF → preview section visible → click to expand → text shown → click to collapse | `simple-text.pdf` | Yes (mock /api/roast/preview) |
| 12 | `"paste instead" link switches to paste mode` | Upload minimal PDF → warning shown → click "Paste instead" → mode switches to paste, file cleared | `minimal.pdf` | Yes (mock /api/roast/preview with warning) |
| 13 | `drag-and-drop PDF upload works` | Drag simple-text.pdf onto drop zone → file name displayed → submit → results | `simple-text.pdf` | Yes (mock /api/roast) |
| 14 | `PDF upload with paid tier skips email requirement` | Upload PDF in paid mode → no email required → submit succeeds | `simple-text.pdf` | Yes (mock /api/roast) |

### Test Structure

```typescript
test.describe('PDF Upload', () => {
  // Helper: mock the roast API with standard response
  // Helper: mock the preview API with configurable response
  // Helper: upload file via input[type=file].setInputFiles()

  test('simple PDF upload → roast results', async ({ page }) => {
    // 1. Route mock for /api/roast → 200 with MOCK_ROAST_RESPONSE
    // 2. Navigate to /
    // 3. Upload simple-text.pdf via file input
    // 4. Verify file name displayed
    // 5. Fill email
    // 6. Click "Roast My Resume"
    // 7. Expect results (score, summary, issues)
  });

  // ... etc
});
```

---

## 8. Unit Test Cases

### `src/lib/__tests__/pdf-extraction.test.ts`

| # | Test | Description |
|---|------|-------------|
| 1 | `extractWithPdfParse returns text for valid PDF buffer` | Mock pdf-parse, verify text returned |
| 2 | `extractWithPdfJs returns text for valid PDF buffer` | Mock pdfjs-dist, verify text concatenation from pages |
| 3 | `extractTextFromPdf uses pdf-parse first` | Verify pdf-parse is attempted before pdfjs |
| 4 | `extractTextFromPdf falls back to pdfjs when pdf-parse throws` | Mock pdf-parse to throw, verify pdfjs called |
| 5 | `extractTextFromPdf falls back to pdfjs when pdf-parse returns < 50 chars` | Mock pdf-parse returning short text, verify pdfjs called |
| 6 | `extractTextFromPdf throws PdfExtractionError when both fail` | Mock both to throw, verify custom error |
| 7 | `encrypted PDF error message mentions password` | Verify error message for PasswordException |
| 8 | `image-only PDF error message suggests paste` | Verify error message when both parsers return empty |
| 9 | `corrupted PDF error message mentions invalid` | Verify error message for parse errors |
| 10 | `extraction result includes method field` | Verify 'pdf-parse' or 'pdfjs' returned |

### `src/lib/__tests__/file-validation.test.ts` (existing — no changes needed)

Already covers: PDF type validation, size validation, formatFileSize.

---

## 9. Implementation Order

1. **Add `pdfjs-dist` dependency** — `npm install pdfjs-dist`
2. **Create `scripts/generate-test-pdfs.ts`** — add `pdf-lib` as dev dependency, generate all 10 fixtures
3. **Run fixture generation** — `npx tsx scripts/generate-test-pdfs.ts` → fixtures in `e2e/fixtures/`
4. **Create `src/lib/pdf-fallback.ts`** — dual-parser extraction with error classification
5. **Refactor `src/app/api/roast/route.ts`** — use new extraction logic, improve error messages
6. **Create `POST /api/roast/preview` route** — lightweight text extraction endpoint
7. **Create `src/components/ExtractedTextPreview.tsx`** — collapsible preview UI
8. **Modify `src/components/ResumeUpload.tsx`** — integrate preview, add quality warning flow
9. **Write unit tests** — `pdf-extraction.test.ts` (10 tests)
10. **Write E2E tests** — `pdf-upload.spec.ts` (14 tests)
11. **Run all tests** — `npm test && npm run e2e`
12. **Update `docs/STATUS.md`** — document new features and known issues

---

## 10. Dependency Changes

### New Production Dependency

```bash
npm install pdfjs-dist
```

- Use `pdfjs-dist/legacy/build/pdf.mjs` for Node.js compatibility
- No canvas dependency needed — text extraction only
- Works in Docker (Node 22 Alpine)

### New Dev Dependencies

```bash
npm install -D pdf-lib tsx
```

- `pdf-lib`: Used only in `scripts/generate-test-pdfs.ts` to create fixture PDFs. Not bundled in production.
- `tsx`: TypeScript executor for the fixture generation script. Ensures `npx tsx` works reliably in CI without on-the-fly downloads.

### Package.json Script

Add to `scripts` in `package.json`:

```json
"generate-fixtures": "tsx scripts/generate-test-pdfs.ts",
"e2e": "npm run generate-fixtures && playwright test"
```

This ensures fixtures are always generated before E2E tests run (locally and in CI).

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `pdfjs-dist` adds significant bundle size | Only imported server-side in route handler — no client bundle impact. Use dynamic `import()` if needed. |
| `pdfjs-dist` worker setup fails in Next.js | Use legacy build (`pdfjs-dist/legacy/build/pdf.mjs`) which doesn't require web workers. Set `GlobalWorkerOptions.workerSrc` to empty string. |
| Generated test PDFs don't match real-world edge cases | Fixtures are a starting point. Add real-world PDFs (anonymized) in future sprints if extraction issues found in production. |
| Preview endpoint adds latency to upload flow | Preview is async — user can still click "Roast My Resume" while preview loads. Preview endpoint has no AI call, should respond in <1s. |
| Large fixture (5MB PDF) bloats git repo | Add `e2e/fixtures/large-5mb.pdf` to `.gitignore` and generate on-demand via script. Or use Git LFS. |
| `pdf-lib` can't create encrypted PDFs | Use `pdf-lib`'s built-in encryption support (UserPassword option in `save()`). If unsupported, use `qpdf` CLI as fallback in generation script. |
| Existing E2E tests break from preview fetch | `error-handling.spec.ts` uploads a fake PDF without mocking `/api/roast/preview`. Fix: preview fetch must silently catch errors (no toast, no UI change on failure). Preview is best-effort. |

---

## 12. Out of Scope

- OCR for image-only PDFs (would require Tesseract — too heavy for Sprint 8)
- DOCX/DOC file support
- Client-side PDF parsing (all extraction stays server-side)
- Batch PDF upload
- PDF content caching/dedup (covered by existing resumeHash)
- Real-world resume corpus testing (future sprint)

---

## 13. Acceptance Criteria

1. All 14 E2E tests pass (`npm run e2e`)
2. All 10 unit tests pass (`npm test`)
3. Valid PDFs (simple, multi-column, multi-page, image-heavy) extract text and produce roast results
4. Encrypted PDFs show user-friendly "password-protected" error
5. Image-only PDFs show "paste instead" suggestion
6. Corrupted files show "invalid PDF" error
7. Files >5MB rejected on client before upload
8. Non-PDF files rejected on client
9. Extracted text preview visible and collapsible after PDF upload
10. Quality warning shown when extracted text < 50 chars
11. "Paste instead" link works from warning state
12. pdf.js fallback activates when pdf-parse fails (verified by unit tests)
13. Existing E2E tests (`roast-flow`, `error-handling`, `email-capture`, etc.) continue to pass without modification

---

## Validation: APPROVED

**Validated:** 2026-03-14
**Validator:** Claude (automated review)

### Checklist

| # | Question | Result | Notes |
|---|----------|--------|-------|
| 1 | Will pdf-lib work for generating test fixtures in Node.js? | PASS | Pure JS, no native deps. Use `save({ userPassword })` for encrypted PDFs (not `encrypt()`). |
| 2 | Will pdfjs-dist fallback work in Next.js server-side (App Router)? | PASS | `pdfjs-dist/legacy/build/pdf.mjs` avoids DOM/worker deps. Pin version in package.json. |
| 3 | Is /api/roast/preview correctly designed? No roast logic duplication? | PASS (fixed) | Contradictory text in Section 5 cleaned up. Double-parsing acceptable for Sprint 8. |
| 4 | Will ExtractedTextPreview integrate cleanly with ResumeUpload.tsx? | PASS | Slots between drop zone and email section. Minimal state additions. |
| 5 | Are the 14 E2E tests covering all important edge cases? | PASS | All critical paths covered: happy paths, error types, UI interactions, tier differences. |
| 6 | Will the fixture generation script run in CI? | PASS (fixed) | Added `tsx` as devDependency. Added `generate-fixtures` script. E2E script now chains fixture generation. |
| 7 | Does error classification cover all pdf-parse failure modes? | PASS | Encrypted, image-only, corrupted covered. Catch-all handles edge cases. |
| 8 | Will existing E2E tests break? | PASS (fixed) | `error-handling.spec.ts` uploads fake PDFs without mocking preview endpoint. Fixed: preview fetch must fail silently (no toast). Added to risks table. |

### Fixes Applied

1. **Section 5 reworded** — Removed contradictory "simpler approach" paragraph. Section now clearly describes the preview endpoint as the chosen approach.
2. **Preview fetch resilience** — Added explicit requirement that preview fetch failures must be silent (no error toast, no UI disruption). This prevents breaking existing E2E tests.
3. **`tsx` added as devDependency** — Ensures fixture generation works reliably in CI without npx on-the-fly downloads.
4. **`generate-fixtures` script added** — E2E script chains fixture generation so they're always up-to-date.
5. **Risks table updated** — Added existing E2E test breakage risk with mitigation.
6. **Acceptance criteria #13 added** — Existing E2E tests must continue to pass.
