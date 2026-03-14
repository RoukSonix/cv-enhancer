import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing stats-cache
vi.mock("@/lib/prisma", () => ({
  prisma: {
    roast: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

import { getPublicStats, invalidateStatsCache } from "@/lib/stats-cache";
import { prisma } from "@/lib/prisma";

const mockCount = prisma.roast.count as ReturnType<typeof vi.fn>;

beforeEach(() => {
  invalidateStatsCache();
  vi.clearAllMocks();
});

describe("getPublicStats", () => {
  it("returns correct shape with totalRoasts and avgRating", async () => {
    mockCount
      .mockResolvedValueOnce(100)  // totalRoasts
      .mockResolvedValueOnce(80)   // positiveRatingCount
      .mockResolvedValueOnce(90);  // totalRatings

    const stats = await getPublicStats();

    expect(stats).toEqual({
      totalRoasts: 100,
      avgRating: 0.89,
      positiveRatingCount: 80,
      totalRatings: 90,
    });
  });

  it("computes avgRating as positiveCount/totalCount, NOT SQL AVG", async () => {
    // 156 positive out of 190 total → 0.82, not SQL AVG((156*1 + 34*-1)/190) = 0.64
    mockCount
      .mockResolvedValueOnce(847)  // totalRoasts
      .mockResolvedValueOnce(156)  // positiveRatingCount
      .mockResolvedValueOnce(190); // totalRatings

    const stats = await getPublicStats();

    expect(stats.avgRating).toBe(0.82);
    // SQL AVG would give 0.64 — this must NOT happen
    expect(stats.avgRating).not.toBe(0.64);
  });

  it("returns cached result within TTL", async () => {
    mockCount
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(45);

    const first = await getPublicStats();
    const second = await getPublicStats();

    expect(first).toEqual(second);
    // prisma.roast.count called 3 times for the first call, not again for cached
    expect(mockCount).toHaveBeenCalledTimes(3);
  });

  it("refreshes after TTL expires", async () => {
    mockCount
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(45);

    await getPublicStats();

    // Invalidate (simulates TTL expiry)
    invalidateStatsCache();

    mockCount
      .mockResolvedValueOnce(60)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(55);

    const refreshed = await getPublicStats();

    expect(refreshed.totalRoasts).toBe(60);
    expect(mockCount).toHaveBeenCalledTimes(6);
  });

  it("returns 0 avgRating when no ratings exist", async () => {
    mockCount
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const stats = await getPublicStats();

    expect(stats.avgRating).toBe(0);
    expect(stats.totalRatings).toBe(0);
  });
});
