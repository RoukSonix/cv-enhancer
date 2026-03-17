import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("/api/health", () => {
  it("returns 200 with status ok", async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  it("returns application/json content type", () => {
    const response = GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns a recent timestamp", async () => {
    const before = Date.now();
    const response = GET();
    const body = await response.json();
    const after = Date.now();

    expect(typeof body.timestamp).toBe("number");
    expect(body.timestamp).toBeGreaterThanOrEqual(before);
    expect(body.timestamp).toBeLessThanOrEqual(after);
  });
});
