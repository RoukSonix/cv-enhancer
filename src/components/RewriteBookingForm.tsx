"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";
import { isValidEmail } from "@/lib/email";
import { validateFile, formatFileSize } from "@/lib/file-validation";

export function RewriteBookingForm() {
  const { data: session } = useSession();
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [notes, setNotes] = useState("");
  const [tier, setTier] = useState<"basic" | "premium">("basic");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Update email when session loads
  if (session?.user?.email && !email) {
    setEmail(session.user.email);
  }

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      toast.error("A valid email address is required.");
      return;
    }

    const hasResume = mode === "upload" ? !!file : !!text.trim();
    if (!hasResume) {
      toast.error("Please upload a PDF or paste your resume text.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("tier", tier);
      formData.set("email", email.trim());
      if (notes.trim()) formData.set("notes", notes.trim());

      if (mode === "upload" && file) {
        formData.set("resume", file);
      } else {
        formData.set("resumeText", text);
      }

      const res = await fetch("/api/checkout/rewrite", {
        method: "POST",
        body: formData,
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    const err = validateFile(dropped);
    if (err) {
      toast.error(err);
    } else {
      setFile(dropped);
    }
  }

  const price = tier === "basic" ? "$99" : "$199";

  return (
    <Card className="border-fire-orange/10" id="booking-form">
      <CardContent className="pt-6 space-y-5">
        {/* Package selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Select Package</label>
          <div className="flex rounded-lg bg-muted p-1 w-fit">
            <button
              onClick={() => setTier("basic")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tier === "basic"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Basic — $99
            </button>
            <button
              onClick={() => setTier("premium")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tier === "premium"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Premium — $199
            </button>
          </div>
        </div>

        {/* Resume input mode */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Your Resume</label>
          <div className="flex rounded-lg bg-muted p-1 w-fit">
            <button
              onClick={() => setMode("upload")}
              className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                mode === "upload"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload PDF
            </button>
            <button
              onClick={() => setMode("paste")}
              className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                mode === "paste"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Paste Text
            </button>
          </div>

          {mode === "upload" ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300
                ${dragOver
                  ? "border-fire-orange bg-fire-orange/5 scale-[1.01]"
                  : "border-muted-foreground/20 hover:border-fire-orange/50 hover:bg-fire-orange/5"
                }
              `}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const err = validateFile(f);
                    if (err) {
                      toast.error(err);
                      e.target.value = "";
                    } else {
                      setFile(f);
                    }
                  }
                }}
              />
              {file ? (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-fire-orange" />
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} · Click or drop to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Drop your resume PDF here or click to browse</p>
                  <p className="text-xs text-muted-foreground/60">PDF only, max 5MB</p>
                </div>
              )}
            </div>
          ) : (
            <Textarea
              placeholder="Paste your resume text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="resize-none border-muted-foreground/20 focus:border-fire-orange/50"
            />
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="rewrite-email" className="block text-sm font-medium mb-1.5">
            Email address
          </label>
          <input
            id="rewrite-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-muted-foreground/20 bg-background px-3 py-2 text-sm focus:border-fire-orange/50 focus:outline-none focus:ring-1 focus:ring-fire-orange/30 transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1">
            We&apos;ll deliver your rewritten resume to this email.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="rewrite-notes" className="block text-sm font-medium mb-1.5">
            Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            id="rewrite-notes"
            placeholder="Any specific roles or industries you're targeting?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none border-muted-foreground/20 focus:border-fire-orange/50"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !(mode === "upload" ? !!file : !!text.trim()) || !isValidEmail(email)}
          className="w-full gradient-fire text-white font-semibold text-base h-12 hover:opacity-90 transition-opacity border-0"
          size="lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          Book My Rewrite — {price}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          One-time payment. Secure checkout via Stripe.
        </p>
      </CardContent>
    </Card>
  );
}
