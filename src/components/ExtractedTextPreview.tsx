"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

interface ExtractedTextPreviewProps {
  text: string;
  charCount: number;
  warning?: string;
  onPasteInstead: () => void;
}

export function ExtractedTextPreview({
  text,
  charCount,
  warning,
  onPasteInstead,
}: ExtractedTextPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {warning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-amber-200">{warning}</p>
            <button
              onClick={onPasteInstead}
              className="text-amber-400 underline hover:text-amber-300 mt-1"
            >
              Paste instead
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        data-testid="preview-toggle"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        Extracted Text Preview
        <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
          {charCount} characters
        </span>
      </button>

      {expanded && (
        <pre className="max-h-48 overflow-auto rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words">
          {text}
        </pre>
      )}
    </div>
  );
}
