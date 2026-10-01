"use client";

import { useState, useTransition } from "react";
import { archiveDownloadAction } from "@/app/seasonal-plan/actions";
import { useT } from "@/lib/i18n/client";

/** Download one archived plan (a fresh one-minute link per click). */
export function ArchiveDownload({ stage, fileKey }: { stage: string; fileKey: string }) {
  const t = useT().pages.seasonal;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const data = new FormData();
            data.set("stage", stage);
            data.set("key", fileKey);
            const result = await archiveDownloadAction(data);
            if (result.url) window.location.href = result.url;
            else setError(result.error ?? t.couldNotOpen);
          })
        }
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-forest transition hover:border-leaf disabled:opacity-60"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {pending ? "…" : t.download}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-danger-ink">
          {error}
        </span>
      ) : null}
    </span>
  );
}
