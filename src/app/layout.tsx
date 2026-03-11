import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resume Roaster -- AI Resume Critique That Actually Hurts",
  description:
    "Upload your resume and get a brutally honest AI critique. Discover what recruiters really think. Score, ATS check, rewritten bullets.",
  openGraph: {
    title: "Resume Roaster -- AI Resume Critique That Actually Hurts",
    description: "Get your resume roasted by AI. Brutal honesty, real advice.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Toaster theme="dark" richColors />
      </body>
    </html>
  );
}
