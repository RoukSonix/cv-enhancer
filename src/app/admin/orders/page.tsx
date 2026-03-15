"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface RewriteOrder {
  id: string;
  email: string;
  tier: string;
  resumeText: string;
  notes: string | null;
  status: string;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending": return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    case "paid": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "in_progress": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "delivered": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

const STATUS_OPTIONS = ["pending", "paid", "in_progress", "delivered"];

export default function AdminOrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<RewriteOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

  function fetchOrders() {
    setLoading(true);
    fetch("/api/admin/orders")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setOrders(data);
        setError(null);
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session || !isAdmin) {
      router.replace("/");
      return;
    }
    fetchOrders();
  }, [session, authStatus, isAdmin, router]);

  async function handleStatusUpdate(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null);
    }
  }

  if (authStatus === "loading" || (loading && !error)) {
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

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Rewrite Orders</h1>
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card className="border-fire-orange/10">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No orders yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const expanded = expandedId === order.id;
              return (
                <Card key={order.id} className="border-fire-orange/10">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => setExpandedId(expanded ? null : order.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{order.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className="capitalize">
                          {order.tier}
                        </Badge>
                        <Badge variant="outline" className={statusBadgeClass(order.status)}>
                          {order.status.replace("_", " ")}
                        </Badge>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                          disabled={updatingId === order.id}
                          className="text-xs rounded border border-border bg-background px-2 py-1"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s.replace("_", " ")}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-4 space-y-3 text-sm border-t border-border pt-4">
                        {order.notes && (
                          <div>
                            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                            <p className="text-muted-foreground">{order.notes}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-1">Resume Text</p>
                          <p className="text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto text-xs">
                            {order.resumeText.slice(0, 1000)}{order.resumeText.length > 1000 ? "..." : ""}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
                          <p>Paid: {order.paidAt ? new Date(order.paidAt).toLocaleString() : "—"}</p>
                          <p>Delivered: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : "—"}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
