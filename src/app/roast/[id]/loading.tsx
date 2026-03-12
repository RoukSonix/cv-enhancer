import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function RoastLoading() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.75 0.15 55 / 0.08), transparent 70%)",
        }}
      />

      {/* Sticky header skeleton */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
        {/* Score card skeleton */}
        <Card className="border-fire-orange/10">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Skeleton className="h-5 w-16 mx-auto rounded-full" />
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-24 w-24 mx-auto rounded-full" />
            <Skeleton className="h-6 w-24 mx-auto rounded-full" />
            <Skeleton className="h-12 w-full max-w-lg mx-auto" />
          </CardContent>
        </Card>

        {/* Top Issues skeleton */}
        <Card className="border-fire-orange/10">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ATS skeleton */}
        <Card className="border-fire-orange/10">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>

        {/* Section skeleton */}
        <Card className="border-fire-orange/10 border-l-4 border-l-muted">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
