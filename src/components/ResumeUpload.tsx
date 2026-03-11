"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Flame } from "lucide-react";
import { LoadingRoast } from "@/components/LoadingRoast";
import type { RoastResult } from "@/lib/types";

interface ResumeUploadProps {
  onResult: (result: RoastResult) => void;
}

export function ResumeUpload({ onResult }: ResumeUploadProps) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("tier", "free");

      if (mode === "upload" && file) {
        formData.set("resume", file);
      } else if (mode === "paste" && text.trim()) {
        formData.set("resumeText", text);
      } else {
        setError("Please upload a PDF or paste your resume text.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/roast", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      onResult(data as RoastResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setError("");
    } else {
      setError("Only PDF files are accepted.");
    }
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
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === "upload"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload PDF
          </button>
          <button
            onClick={() => setMode("paste")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
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
              border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
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
                  setFile(f);
                  setError("");
                }
              }}
            />
            {file ? (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-fire-orange" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  Click or drop to replace
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={mode === "upload" ? !file : !text.trim()}
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
