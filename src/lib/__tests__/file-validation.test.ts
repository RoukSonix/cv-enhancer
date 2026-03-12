import { describe, it, expect } from "vitest";
import { validateFile, formatFileSize, MAX_FILE_SIZE } from "@/lib/file-validation";

function makeFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("validateFile", () => {
  it("accepts a valid PDF under 5MB", () => {
    const file = makeFile("resume.pdf", 1024 * 1024, "application/pdf");
    expect(validateFile(file)).toBeNull();
  });

  it("rejects a file over 5MB", () => {
    const file = makeFile("big.pdf", MAX_FILE_SIZE + 1, "application/pdf");
    const result = validateFile(file);
    expect(result).toContain("File too large");
    expect(result).toContain("5MB");
  });

  it("rejects a non-PDF file", () => {
    const file = makeFile("notes.txt", 1024, "text/plain");
    expect(validateFile(file)).toBe("Only PDF files are accepted.");
  });

  it("accepts a file exactly at 5MB boundary", () => {
    const file = makeFile("exact.pdf", MAX_FILE_SIZE, "application/pdf");
    expect(validateFile(file)).toBeNull();
  });

  it("rejects a .docx file", () => {
    const file = makeFile(
      "resume.docx",
      1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(validateFile(file)).toBe("Only PDF files are accepted.");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1500)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(2500000)).toBe("2.4 MB");
  });

  it("formats exactly 1KB", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });

  it("formats exactly 1MB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});
