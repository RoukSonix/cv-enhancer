import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock pdf-parse
const mockGetText = vi.fn();
const mockDestroy = vi.fn().mockResolvedValue(undefined);
vi.mock("pdf-parse", () => {
  return {
    PDFParse: vi.fn().mockImplementation(function () {
      return { getText: mockGetText, destroy: mockDestroy };
    }),
  };
});

// Mock pdfjs-dist
const mockGetTextContent = vi.fn();
const mockGetPage = vi.fn().mockImplementation(() =>
  Promise.resolve({ getTextContent: mockGetTextContent })
);
const mockDocDestroy = vi.fn();
const mockPdfjsGetDocument = vi.fn();
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: mockPdfjsGetDocument,
}));

// Default: pdfjs returns a 1-page doc
function setupPdfjsMock() {
  mockPdfjsGetDocument.mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: mockGetPage,
      destroy: mockDocDestroy,
    }),
  });
}

import { extractTextFromPdf, PdfExtractionError } from "../pdf-fallback";

const VALID_RESUME_TEXT =
  "Jane Doe - Software Engineer. 5 years experience at TechCorp building scalable web applications with React and Node.js.";
const SHORT_TEXT = "Hi";

const fakeBuffer = Buffer.from("fake-pdf-content");

beforeEach(() => {
  vi.clearAllMocks();
  setupPdfjsMock();
});

describe("extractTextFromPdf", () => {
  test("extractWithPdfParse returns text for valid PDF buffer", async () => {
    mockGetText.mockResolvedValueOnce({ text: VALID_RESUME_TEXT });

    const result = await extractTextFromPdf(fakeBuffer);
    expect(result.text).toBe(VALID_RESUME_TEXT);
    expect(result.method).toBe("pdf-parse");
  });

  test("extractTextFromPdf uses pdf-parse first", async () => {
    mockGetText.mockResolvedValueOnce({ text: VALID_RESUME_TEXT });

    const result = await extractTextFromPdf(fakeBuffer);
    expect(result.method).toBe("pdf-parse");
    expect(mockGetText).toHaveBeenCalled();
  });

  test("extractTextFromPdf falls back to pdfjs when pdf-parse throws", async () => {
    mockGetText.mockRejectedValueOnce(new Error("pdf-parse error"));
    mockGetTextContent.mockResolvedValueOnce({
      items: [{ str: VALID_RESUME_TEXT }],
    });

    const result = await extractTextFromPdf(fakeBuffer);
    expect(result.method).toBe("pdfjs");
    expect(result.text).toContain("Jane Doe");
  });

  test("extractTextFromPdf falls back to pdfjs when pdf-parse returns < 50 chars", async () => {
    mockGetText.mockResolvedValueOnce({ text: SHORT_TEXT });
    mockGetTextContent.mockResolvedValueOnce({
      items: [{ str: VALID_RESUME_TEXT }],
    });

    const result = await extractTextFromPdf(fakeBuffer);
    expect(result.method).toBe("pdfjs");
    expect(result.text).toContain("Jane Doe");
  });

  test("extractWithPdfJs returns text for valid PDF buffer", async () => {
    mockGetText.mockRejectedValueOnce(new Error("force pdfjs path"));
    mockGetTextContent.mockResolvedValueOnce({
      items: [
        { str: "Page 1 " },
        { str: "content here with enough text to pass the minimum threshold check easily." },
      ],
    });

    const result = await extractTextFromPdf(fakeBuffer);
    expect(result.method).toBe("pdfjs");
    expect(result.text).toContain("Page 1");
    expect(result.text).toContain("content here");
  });

  test("extractTextFromPdf throws PdfExtractionError when both fail", async () => {
    mockGetText.mockRejectedValueOnce(new Error("pdf-parse failed"));
    mockPdfjsGetDocument.mockReturnValueOnce({
      promise: Promise.reject(new Error("Invalid PDF structure")),
    });

    await expect(extractTextFromPdf(fakeBuffer)).rejects.toThrow(PdfExtractionError);
  });

  test("encrypted PDF error message mentions password", async () => {
    mockGetText.mockRejectedValueOnce(new Error("PasswordException: password required"));
    mockPdfjsGetDocument.mockReturnValueOnce({
      promise: Promise.reject(new Error("PasswordRequired")),
    });

    try {
      await extractTextFromPdf(fakeBuffer);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PdfExtractionError);
      expect((err as PdfExtractionError).message).toContain("password-protected");
      expect((err as PdfExtractionError).code).toBe("encrypted");
    }
  });

  test("image-only PDF error message suggests paste", async () => {
    mockGetText.mockResolvedValueOnce({ text: "" });
    mockGetTextContent.mockResolvedValueOnce({ items: [] });

    try {
      await extractTextFromPdf(fakeBuffer);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PdfExtractionError);
      expect((err as PdfExtractionError).message).toContain("only images");
      expect((err as PdfExtractionError).code).toBe("image-only");
    }
  });

  test("corrupted PDF error message mentions invalid", async () => {
    mockGetText.mockRejectedValueOnce(new Error("corrupt data"));
    mockPdfjsGetDocument.mockReturnValueOnce({
      promise: Promise.reject(new Error("Invalid or corrupt PDF file")),
    });

    try {
      await extractTextFromPdf(fakeBuffer);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PdfExtractionError);
      expect((err as PdfExtractionError).message).toContain("valid PDF");
      expect((err as PdfExtractionError).code).toBe("corrupted");
    }
  });

  test("extraction result includes method field", async () => {
    mockGetText.mockResolvedValueOnce({ text: VALID_RESUME_TEXT });

    const result = await extractTextFromPdf(fakeBuffer);
    expect(result).toHaveProperty("method");
    expect(["pdf-parse", "pdfjs"]).toContain(result.method);
  });
});
