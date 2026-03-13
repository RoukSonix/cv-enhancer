"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Linkedin, Link2, Check } from "lucide-react";
import { buildTwitterShareUrl, buildLinkedInShareUrl } from "@/lib/og-utils";

interface ShareButtonsProps {
  score: number;
  label: string;
  url: string;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ShareButtons({ score, label, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  function handleTwitter() {
    window.open(buildTwitterShareUrl(score, url), "_blank", "noopener,noreferrer");
  }

  function handleLinkedIn() {
    window.open(buildLinkedInShareUrl(url), "_blank", "noopener,noreferrer");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 hover:border-fire-orange hover:text-fire-orange transition-colors"
        onClick={handleTwitter}
        data-testid="share-twitter"
      >
        <XIcon className="w-4 h-4" />
        Share on X
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 hover:border-fire-orange hover:text-fire-orange transition-colors"
        onClick={handleLinkedIn}
        data-testid="share-linkedin"
      >
        <Linkedin className="w-4 h-4" />
        Share on LinkedIn
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 hover:border-fire-orange hover:text-fire-orange transition-colors"
        onClick={handleCopyLink}
        data-testid="share-copy-link"
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        {copied ? "Copied!" : "Copy Link"}
      </Button>
    </div>
  );
}
