import { ImageResponse } from "@vercel/og";
import { prisma } from "@/lib/prisma";
import { scoreLabel, scoreColor, scoreColorSecondary, truncateSummary } from "@/lib/og-utils";
import type { RoastResult } from "@/lib/types";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
};

async function loadFonts() {
  const [bold, regular] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/Inter-Bold.ttf")),
    readFile(join(process.cwd(), "public/fonts/Inter-Regular.ttf")),
  ]);
  return { bold, regular };
}

function OgImage({ score, label, summary, color }: {
  score: number;
  label: string;
  summary: string;
  color: string;
}) {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1410",
        position: "relative",
        fontFamily: "Inter",
      }}
    >
      {/* Radial gradient overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(249, 115, 22, 0.08), transparent 70%)",
        }}
      />

      {/* Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "40px",
          fontSize: "24px",
          fontWeight: 700,
          color: "#f5f5f0",
        }}
      >
        <span>🔥</span>
        <span>RESUME ROASTER</span>
      </div>

      {/* Score circle */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "160px",
          height: "160px",
          borderRadius: "80px",
          border: `8px solid ${color}`,
          marginBottom: "20px",
        }}
      >
        <span style={{ fontSize: "80px", fontWeight: 700, color: "#f5f5f0", lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: "24px", color: "#a8a090", marginTop: "-4px" }}>
          /100
        </span>
      </div>

      {/* Score label badge */}
      <div
        style={{
          display: "flex",
          padding: "8px 24px",
          borderRadius: "20px",
          backgroundColor: `${color}26`,
          color: color,
          fontSize: "28px",
          fontWeight: 600,
          marginBottom: "24px",
        }}
      >
        {label}
      </div>

      {/* Summary */}
      <div
        style={{
          fontSize: "22px",
          color: "#a8a090",
          textAlign: "center",
          maxWidth: "800px",
          lineHeight: 1.4,
          marginBottom: "32px",
          display: "flex",
        }}
      >
        {`"${summary}"`}
      </div>

      {/* Brand footer */}
      <div style={{ fontSize: "18px", color: "#f97316", fontWeight: 500, display: "flex" }}>
        resumeroaster.com
      </div>
    </div>
  );
}

function FallbackImage() {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1410",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(249, 115, 22, 0.08), transparent 70%)",
        }}
      />
      <span style={{ fontSize: "64px", marginBottom: "24px" }}>🔥</span>
      <div style={{ fontSize: "40px", fontWeight: 700, color: "#f5f5f0", marginBottom: "16px", display: "flex" }}>
        Resume Roaster
      </div>
      <div style={{ fontSize: "24px", color: "#a8a090", display: "flex" }}>
        Get your resume roasted by AI
      </div>
      <div style={{ fontSize: "18px", color: "#f97316", fontWeight: 500, marginTop: "32px", display: "flex" }}>
        resumeroaster.com
      </div>
    </div>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fonts = await loadFonts();

  const roast = await prisma.roast.findUnique({
    where: { id },
    select: { result: true },
  });

  if (!roast) {
    return new ImageResponse(<FallbackImage />, {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: fonts.bold, weight: 700 as const, style: "normal" as const },
      ],
      headers: CACHE_HEADERS,
    });
  }

  const result = roast.result as unknown as RoastResult;
  const score = result.overallScore;
  const label = scoreLabel(score);
  const summary = truncateSummary(result.summary);
  const color = scoreColor(score);

  return new ImageResponse(
    <OgImage score={score} label={label} summary={summary} color={color} />,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: fonts.bold, weight: 700 as const, style: "normal" as const },
        { name: "Inter", data: fonts.regular, weight: 400 as const, style: "normal" as const },
      ],
      headers: CACHE_HEADERS,
    }
  );
}
