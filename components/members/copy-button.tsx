"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard can be unavailable (http, permissions) — no crash.
        }
      }}
      className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink-muted transition hover:text-ink"
      aria-label={`Copy ${text}`}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
