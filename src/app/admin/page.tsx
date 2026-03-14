"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

interface AdminStats {
  totalRoasts: number;
  freeRoasts: number;
  paidRoasts: number;
  conversionRate: number;
  revenueEstimate: number;
  avgScore: number;
  avgRating: number;
  totalRatings: number;
  roastsToday: number;
  roastsThisWeek: number;
  roastsThisMonth: number;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-fire-orange/10">
      <CardContent className="pt-6 text-center space-y-1">
        <p className="text-2xl font-bold text-gradient-fire">{value}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

  useEffect(() => {
    if (status === "loading") return;

    if (!session || !isAdmin) {
      router.replace("/");
      return;
    }

    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(setStats)
      .catch(() => setError("Failed to load stats."));
  }, [session, status, isAdmin, router]);

  if (status === "loading" || (!stats && !error)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Total Roasts" value={stats.totalRoasts.toLocaleString()} />
          <StatCard label="Free Roasts" value={stats.freeRoasts.toLocaleString()} />
          <StatCard label="Paid Roasts" value={stats.paidRoasts.toLocaleString()} />
          <StatCard label="Conversion Rate" value={`${Math.round(stats.conversionRate * 100)}%`} />
          <StatCard label="Revenue Estimate" value={`$${stats.revenueEstimate.toLocaleString()}`} />
          <StatCard label="Avg Score" value={stats.avgScore} />
          <StatCard label="Avg Rating" value={stats.totalRatings > 0 ? `${Math.round(stats.avgRating * 100)}%` : "N/A"} />
          <StatCard label="Total Ratings" value={stats.totalRatings} />
          <StatCard label="Today" value={stats.roastsToday} />
          <StatCard label="This Week" value={stats.roastsThisWeek} />
          <StatCard label="This Month" value={stats.roastsThisMonth} />
        </div>
      </div>
    </main>
  );
}
