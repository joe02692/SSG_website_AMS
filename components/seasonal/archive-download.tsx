"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveDownloadAction, purgeArchivedPlanAction } from "@/app/seasonal-plan/actions";
import { useT } from "@/lib/i18n/client";

/**
 * Download one archived plan (a fresh one-minute link per click), and — for the
 * head site admin only — delete it for good.
 */
export function ArchiveDownload({
  stage,
  fileKey,
  canPurge = false,
}: {
  stage: string;
  fileKey: string;
  canPurge?: boolean;
}) {
  const t = useT().pages.seasonal;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  function purge() {
    start(async () => {
      setError(null);
      const data = new FormData();
      data.set("stage", stage);
      data.set("key", fileKey);
      const result = await purgeArchivedPlanAction(data);
      setArmed(false);
      if (result.error) return setError(result.error);
      router.refresh();
    });
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
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
      {canPurge && !armed ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setArmed(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-danger-ink/40 px-3 py-1.5 text-sm font-semibold text-danger-ink transition hover:bg-danger-ink/5 disabled:opacity-60"
        >
          {t.purge}
        </button>
      ) : null}
      {armed ? (
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-danger-ink">{t.purgeArchivedQuestion}</span>
          <button
            type="button"
            disabled={pending}
            onClick={purge}
            className="rounded-md bg-danger-solid px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? t.purging : t.yesPurge}
          </button>
          <button type="button" onClick={() => setArmed(false)} className="text-sm font-medium text-ink-muted hover:text-ink">
            {t.cancel}
          </button>
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="text-xs text-danger-ink">
          {error}
        </span>
      ) : null}
    </span>
  );
}
