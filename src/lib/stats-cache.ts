import { prisma } from "@/lib/prisma";

export interface PublicStats {
  totalRoasts: number;
  avgRating: number;
  positiveRatingCount: number;
  totalRatings: number;
}

export interface AdminStats extends PublicStats {
  freeRoasts: number;
  paidRoasts: number;
  conversionRate: number;
  revenueEstimate: number;
  avgScore: number;
  roastsToday: number;
  roastsThisWeek: number;
  roastsThisMonth: number;
}

let cached: { data: PublicStats; timestamp: number } | null = null;
const TTL = 60_000; // 60 seconds

export async function getPublicStats(): Promise<PublicStats> {
  if (cached && Date.now() - cached.timestamp < TTL) {
    return cached.data;
  }

  const [totalRoasts, positiveRatingCount, totalRatings] = await Promise.all([
    prisma.roast.count(),
    prisma.roast.count({ where: { rating: 1 } }),
    prisma.roast.count({ where: { rating: { not: null } } }),
  ]);

  const avgRating = totalRatings > 0 ? positiveRatingCount / totalRatings : 0;

  const data: PublicStats = {
    totalRoasts,
    avgRating: Math.round(avgRating * 100) / 100,
    positiveRatingCount,
    totalRatings,
  };

  cached = { data, timestamp: Date.now() };
  return data;
}

export function invalidateStatsCache() {
  cached = null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalRoasts,
    paidRoasts,
    positiveRatingCount,
    totalRatings,
    avgScoreResult,
    roastsToday,
    roastsThisWeek,
    roastsThisMonth,
  ] = await Promise.all([
    prisma.roast.count(),
    prisma.roast.count({ where: { paid: true } }),
    prisma.roast.count({ where: { rating: 1 } }),
    prisma.roast.count({ where: { rating: { not: null } } }),
    prisma.roast.aggregate({ _avg: { overallScore: true } }),
    prisma.roast.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.roast.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.roast.count({ where: { createdAt: { gte: startOfMonth } } }),
  ]);

  const freeRoasts = totalRoasts - paidRoasts;
  const conversionRate = totalRoasts > 0 ? paidRoasts / totalRoasts : 0;
  const avgRating = totalRatings > 0 ? positiveRatingCount / totalRatings : 0;

  // Revenue estimate: count paid roasts, estimate mix of single ($9.99) and bundle ($24.99/3)
  // Conservative: assume all are single purchases
  const revenueEstimate = paidRoasts * 9.99;

  return {
    totalRoasts,
    freeRoasts,
    paidRoasts,
    conversionRate: Math.round(conversionRate * 100) / 100,
    revenueEstimate: Math.round(revenueEstimate * 100) / 100,
    avgScore: Math.round(avgScoreResult._avg.overallScore ?? 0),
    avgRating: Math.round(avgRating * 100) / 100,
    positiveRatingCount,
    totalRatings,
    roastsToday,
    roastsThisWeek,
    roastsThisMonth,
  };
}
