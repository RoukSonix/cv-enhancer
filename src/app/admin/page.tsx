"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react";

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

function AdminDashboard() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing token");
      return;
    }
    fetch(`/api/admin/stats?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(setStats)
      .catch(() => setError("Failed to load stats. Check your token."));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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

export default function AdminPage() {
  return (
    <Suspense>
      <AdminDashboard />
    </Suspense>
  );
}
