import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SharedRoastView } from "@/components/SharedRoastView";
import { scoreLabel } from "@/lib/score";
import type { RoastResult } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const getRoast = cache(async (id: string) => {
  const roast = await prisma.roast.findUnique({
    where: { id },
    select: { result: true },
  });
  return roast;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const roast = await getRoast(id);

  if (!roast) {
    return { title: "Not Found | Resume Roaster" };
  }

  const result = roast.result as unknown as RoastResult;
  const score = result.overallScore;
  const label = scoreLabel(score);
  const description = result.summary.slice(0, 160);

  const ogImageUrl = `/api/og/${id}`;

  return {
    title: `Resume Score: ${score}/100 — ${label} | Resume Roaster`,
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

export default async function RoastByIdPage({ params }: PageProps) {
  const { id } = await params;
  const roast = await getRoast(id);

  if (!roast) {
    notFound();
  }

  const result = roast.result as unknown as RoastResult;
  // Strip email from shared results to protect privacy (server-side)
  const safeResult = { ...result, email: undefined, marketingOptIn: undefined };
  return <SharedRoastView result={safeResult} />;
}
