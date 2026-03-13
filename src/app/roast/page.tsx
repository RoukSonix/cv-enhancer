import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SharedRoastView } from "@/components/SharedRoastView";
import { decodeRoastResult } from "@/lib/share";
import { scoreLabel } from "@/lib/score";

interface PageProps {
  searchParams: Promise<{ r?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { r } = await searchParams;

  if (!r) {
    return { title: "Share Results | Resume Roaster" };
  }

  const result = decodeRoastResult(r);
  if (!result) {
    return { title: "Invalid Link | Resume Roaster" };
  }

  const score = result.overallScore;
  const label = scoreLabel(score);
  const description = result.summary.slice(0, 160);
  const title = `Resume Score: ${score}/100 — ${label} | Resume Roaster`;

  const ogImageUrl = `/api/og?r=${r}`;

  return {
    title,
    description,
    openGraph: {
      title: `Resume Score: ${score}/100 — ${label}`,
      description,
      type: "article",
      siteName: "Resume Roaster",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Resume score: ${score}/100 — ${label}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Resume Score: ${score}/100 — ${label}`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function RoastPage({ searchParams }: PageProps) {
  const { r } = await searchParams;

  if (!r) {
    return <ErrorState message="No results to display" />;
  }

  const result = decodeRoastResult(r);
  if (!result) {
    return <ErrorState message="This share link is invalid or expired" />;
  }

  return <SharedRoastView result={result} />;
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 px-4">
        <Flame className="w-12 h-12 mx-auto text-fire-orange opacity-50" />
        <h1 className="text-2xl font-bold">{message}</h1>
        <p className="text-muted-foreground">
          Try roasting your own resume instead.
        </p>
        <Button asChild>
          <Link href="/">Roast your own resume &rarr;</Link>
        </Button>
      </div>
    </main>
  );
}
