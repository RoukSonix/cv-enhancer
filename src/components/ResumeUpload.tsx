"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Flame, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingRoast } from "@/components/LoadingRoast";
import { ExtractedTextPreview } from "@/components/ExtractedTextPreview";
import { isValidEmail } from "@/lib/email";
import { validateFile, formatFileSize } from "@/lib/file-validation";
import type { RoastResult } from "@/lib/types";

const ROAST_TIMEOUT_MS = 60_000;

interface ResumeUploadProps {
  onResult: (result: RoastResult) => void;
  tier?: "free" | "paid";
}

export function ResumeUpload({ onResult, tier }: ResumeUploadProps) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<{
    text: string;
    charCount: number;
    method: string;
    warning?: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch text preview when a file is selected
  useEffect(() => {
    if (!file) {
      setExtractedPreview(null);
      return;
    }

    const controller = new AbortController();
    setPreviewLoading(true);

    const fetchPreview = async () => {
      try {
        const formData = new FormData();
        formData.set("resume", file);
        const res = await fetch("/api/roast/preview", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setExtractedPreview(data);
        }
      } catch {
        // Preview is best-effort — silently ignore errors
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();
    return () => controller.abort();
  }, [file]);

  async function handleSubmit() {
    setLoading(true);
    setTimedOut(false);

    try {
      // Email validation
      const isFree = tier !== "paid";
      if (isFree && (!email.trim() || !isValidEmail(email))) {
        toast.error("A valid email address is required.");
        setLoading(false);
        return;
      }
      if (email.trim() && !isValidEmail(email)) {
        toast.error("Please enter a valid email address.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.set("tier", tier ?? "free");
      formData.set("email", email.trim());
      formData.set("marketingOptIn", marketingOptIn ? "true" : "false");

      if (mode === "upload" && file) {
        const fileErr = validateFile(file);
        if (fileErr) {
          toast.error(fileErr);
          setFile(null);
          setLoading(false);
          return;
        }
        formData.set("resume", file);
      } else if (mode === "paste" && text.trim()) {
        formData.set("resumeText", text);
      } else {
        toast.error("Please upload a PDF or paste your resume text.");
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        setTimedOut(true);
      }, ROAST_TIMEOUT_MS);

      try {
        const res = await fetch("/api/roast", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Something went wrong.");
          return;
        }
        onResult(data as RoastResult);
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof DOMException && err.name === "AbortError") {
          toast.error("Request timed out. Please try again.");
          setTimedOut(true);
        } else {
          toast.error("Network error. Please try again.");
        }
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
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

  if (timedOut) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-fire-orange/20">
        <CardContent className="pt-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 mx-auto text-fire-orange" />
          <p className="font-medium">The roast is taking longer than expected</p>
          <p className="text-sm text-muted-foreground">
            Our AI might be overwhelmed. Give it another shot.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => { setTimedOut(false); handleSubmit(); }}
              className="gradient-fire text-white font-semibold border-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="ghost"
              onClick={() => setTimedOut(false)}
              className="text-muted-foreground"
            >
              Change resume
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-fire-orange/20 glow-fire">
        <CardContent className="pt-6">
          <LoadingRoast />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-fire-orange/10 animate-pulse-glow">
      <CardContent className="pt-6 space-y-5">
        {/* Segmented control */}
        <div className="flex rounded-lg bg-muted p-1 w-fit mx-auto">
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
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer
              transition-all duration-300
              ${
                dragOver
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
              <div className="space-y-3">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Drop your resume PDF here or click to browse
                </p>
                <p className="text-xs text-muted-foreground/60">
                  PDF only, max 5MB
                </p>
              </div>
            )}
          </div>
        ) : (
          <Textarea
            placeholder="Paste your resume text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="resize-none border-muted-foreground/20 focus:border-fire-orange/50"
          />
        )}

        {/* Extracted text preview */}
        {mode === "upload" && previewLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Extracting text...
          </div>
        )}
        {mode === "upload" && extractedPreview && !previewLoading && (
          <ExtractedTextPreview
            text={extractedPreview.text}
            charCount={extractedPreview.charCount}
            warning={extractedPreview.warning}
            onPasteInstead={() => {
              setMode("paste");
              setFile(null);
              setExtractedPreview(null);
            }}
          />
        )}

        {/* Email capture */}
        <div className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                if (email.trim() && !isValidEmail(email)) {
                  toast.error("Please enter a valid email address.");
                }
              }}
              className="w-full rounded-md border border-muted-foreground/20 bg-background px-3 py-2 text-sm focus:border-fire-orange/50 focus:outline-none focus:ring-1 focus:ring-fire-orange/30 transition-colors"
            />
            {tier === "paid" && (
              <p className="text-xs text-muted-foreground mt-1">Optional — skip if you prefer</p>
            )}
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 rounded border-muted-foreground/30"
            />
            <span className="text-sm">Send me resume tips & career advice</span>
          </label>

          <p className="text-xs text-muted-foreground">
            We&apos;ll only use your email to deliver your results and, if opted in, send career tips. You can unsubscribe anytime.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={(() => {
            const hasResume = mode === "upload" ? !!file : !!text.trim();
            const emailOk = tier === "paid" || isValidEmail(email);
            return !hasResume || !emailOk;
          })()}
          className="w-full gradient-fire text-white font-semibold text-base h-12 hover:opacity-90 transition-opacity border-0"
          size="lg"
        >
          <Flame className="w-5 h-5 mr-2" />
          Roast My Resume
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Free: score + top 3 issues. Full roast with rewritten bullets for $9.99.
        </p>
      </CardContent>
    </Card>
  );
}
