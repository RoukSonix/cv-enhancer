"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PenTool, Upload, Clock, CheckCircle, Star } from "lucide-react";
import { RewriteBookingForm } from "@/components/RewriteBookingForm";

const tiers = [
  {
    name: "Basic",
    price: "$99",
    features: [
      "Professional resume rewrite",
      "ATS optimization",
      "3-day turnaround",
      "1 revision round",
    ],
    accent: "border-fire-orange/30",
  },
  {
    name: "Premium",
    price: "$199",
    popular: true,
    features: [
      "Everything in Basic",
      "LinkedIn profile rewrite",
      "Cover letter",
      "24hr turnaround",
      "Unlimited revisions",
      "Strategy call",
    ],
    accent: "border-fire-orange",
  },
];

const steps = [
  { icon: Upload, title: "Upload", desc: "Share your current resume" },
  { icon: PenTool, title: "We Rewrite", desc: "Our experts craft your new resume" },
  { icon: CheckCircle, title: "You Land Interviews", desc: "Stand out to recruiters" },
];

const faqs = [
  {
    q: "Who writes my resume?",
    a: "Your resume is rewritten by professional resume writers with hiring manager experience. We combine human expertise with AI-powered ATS optimization.",
  },
  {
    q: "What do I need to provide?",
    a: "Just upload your current resume (PDF or paste text) and tell us about your target roles. We handle the rest.",
  },
  {
    q: "How many revisions are included?",
    a: "Basic includes 1 round of revisions. Premium includes unlimited revisions until you're satisfied.",
  },
  {
    q: "What's the turnaround time?",
    a: "Basic: 3 business days. Premium: 24 hours. You'll receive an email when your rewrite is ready.",
  },
  {
    q: "What's the refund policy?",
    a: "If we can't deliver a meaningful improvement to your resume, we'll refund your purchase. Contact us within 7 days of delivery.",
  },
  {
    q: "What format will I receive?",
    a: "You'll receive your rewritten resume in both DOCX and PDF formats, ready to submit to employers.",
  },
];

export default function RewritePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <PenTool className="w-12 h-12 mx-auto text-fire-orange" />
          <h1 className="text-4xl font-bold text-gradient-fire">
            Professional Resume Rewrite
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Let our expert writers transform your resume into a job-winning document.
            ATS-optimized, tailored to your target roles.
          </p>
          <div className="flex gap-3 justify-center">
            <Badge variant="outline" className="text-base px-3 py-1 border-fire-orange/30 text-fire-orange">
              Basic — $99
            </Badge>
            <Badge variant="outline" className="text-base px-3 py-1 border-fire-orange text-fire-orange">
              Premium — $199
            </Badge>
          </div>
        </div>

        {/* How It Works */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <Card key={i} className="border-fire-orange/10 text-center">
                  <CardContent className="pt-6 space-y-2">
                    <div className="w-12 h-12 rounded-full gradient-fire flex items-center justify-center mx-auto">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Choose Your Package</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tiers.map((t) => (
              <Card key={t.name} className={`relative ${t.accent} ${t.popular ? "border-2" : ""}`}>
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-fire text-white border-0">
                      <Star className="w-3 h-3 mr-1" /> Most Popular
                    </Badge>
                  </div>
                )}
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{t.name}</p>
                    <p className="text-3xl font-bold text-gradient-fire">{t.price}</p>
                  </div>
                  <ul className="space-y-2">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Booking Form */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Book Your Rewrite</h2>
          <RewriteBookingForm />
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
