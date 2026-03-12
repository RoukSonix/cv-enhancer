import { describe, it, expect } from "vitest";
import { isValidEmail } from "../email";

describe("isValidEmail", () => {
  it("accepts a standard email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts email with plus and subdomain", () => {
    expect(isValidEmail("name+tag@domain.co.uk")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects string without @ and domain", () => {
    expect(isValidEmail("notanemail")).toBe(false);
  });

  it("rejects missing local part", () => {
    expect(isValidEmail("@domain.com")).toBe(false);
  });

  it("rejects missing domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects email with spaces", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });

  it("trims whitespace and accepts valid email", () => {
    expect(isValidEmail("  user@example.com  ")).toBe(true);
  });
});
