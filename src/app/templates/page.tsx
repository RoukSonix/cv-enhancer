"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Sparkles, Briefcase, Code, Shield } from "lucide-react";

const templates = [
  {
    name: "Modern Minimal",
    description:
      "Clean single-column layout with subtle accents. Generous whitespace lets your content breathe while maintaining a contemporary, polished look.",
    bestFor: "Design, Marketing, Startups",
    icon: Sparkles,
    accentColor: "text-violet-400",
    bgAccent: "bg-violet-500/10",
  },
  {
    name: "Corporate",
    description:
      "Traditional two-column format with conservative styling. Follows the formatting expectations of established industries and large organizations.",
    bestFor: "Finance, Consulting, Legal",
    icon: Briefcase,
    accentColor: "text-blue-400",
    bgAccent: "bg-blue-500/10",
  },
  {
    name: "Creative Bold",
    description:
      "Eye-catching color blocks and visual hierarchy. Stand out with bold section headers and emphasis on your creative achievements and portfolio.",
    bestFor: "Creative roles, Portfolios",
    icon: Sparkles,
    accentColor: "text-pink-400",
    bgAccent: "bg-pink-500/10",
  },
  {
    name: "Tech / Developer",
    description:
      "Monospace accents, skills matrix, and project showcase sections. Optimized for showcasing technical skills, open source contributions, and engineering experience.",
    bestFor: "Software Engineers, DevOps, Data",
    icon: Code,
    accentColor: "text-emerald-400",
    bgAccent: "bg-emerald-500/10",
  },
  {
    name: "ATS-Optimized",
    description:
      "Maximum ATS compatibility with simple formatting and standard headers. Uses only proven-safe formatting for the highest pass rate through applicant tracking systems.",
    bestFor: "Any role — highest pass rate",
    icon: Shield,
    accentColor: "text-amber-400",
    bgAccent: "bg-amber-500/10",
  },
];

const faqs = [
  {
    q: "What format are the templates?",
    a: "All templates are in DOCX format, compatible with Microsoft Word, Google Docs, and LibreOffice. Edit them freely to match your experience.",
  },
  {
    q: "Are the templates editable?",
    a: "Yes! Each template is a fully editable DOCX file with placeholder sections. Just replace the placeholders with your own content.",
  },
  {
    q: "Do I get all 5 templates?",
    a: "Yes — the $29 purchase includes all 5 template styles as a single download. Use whichever template best fits your target role.",
  },
  {
    q: "What's the refund policy?",
    a: "Due to the digital nature of the product, we don't offer refunds after download. If you have issues, contact us and we'll help.",
  },
];

export default function TemplatesPage() {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
        setLoading(false);
      }
    } catch {
      toast.error("Failed to start checkout");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <FileText className="w-12 h-12 mx-auto text-fire-orange" />
          <h1 className="text-4xl font-bold text-gradient-fire">
            Resume Template Pack
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            5 professionally designed resume templates, optimized for different industries
            and career stages. Edit in Word or Google Docs.
          </p>
          <Badge variant="outline" className="text-lg px-4 py-1 border-fire-orange/30 text-fire-orange">
            $29 — All 5 Templates
          </Badge>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.name} className="border-fire-orange/10 hover:border-fire-orange/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className={`w-10 h-10 rounded-lg ${template.bgAccent} flex items-center justify-center mb-2`}>
                    <Icon className={`w-5 h-5 ${template.accentColor}`} />
                  </div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <p className="text-xs font-medium text-fire-orange">
                    Best for: {template.bestFor}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Purchase CTA */}
        <div className="text-center">
          <Button
            size="lg"
            className="gradient-fire text-white font-semibold h-14 px-10 text-lg hover:opacity-90 transition-opacity border-0 animate-pulse-glow"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Buy Template Pack — $29
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            One-time payment. Instant download. No subscription.
          </p>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {faqs.map((faq) => (
              <Card key={faq.q} className="border-fire-orange/10">
                <CardContent className="pt-4 space-y-2">
                  <p className="font-semibold text-sm">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
