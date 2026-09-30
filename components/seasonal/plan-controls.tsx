"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPlanUploadAction,
  deletePlanAction,
  planDownloadAction,
  savePlanAction,
} from "@/app/seasonal-plan/actions";
import { MAX_PLAN_BYTES, PLAN_ACCEPT, planExtension } from "@/lib/seasonal-plan-rules";
import { useT } from "@/lib/i18n/client";

const button =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60";

/**
 * Download, and — for whoever may manage this stage — add / replace / delete.
 *
 * The server re-checks every step; hiding these buttons from other leaders is
 * only tidiness.
 */
export function PlanControls({
  stage,
  hasPlan,
  canManage,
}: {
  stage: string;
  hasPlan: boolean;
  canManage: boolean;
}) {
  const t = useT().pages.seasonal;
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const busy = pending || status !== null;

  function form(values: Record<string, string>) {
    const data = new FormData();
    data.set("stage", stage);
    for (const [k, v] of Object.entries(values)) data.set(k, v);
    return data;
  }

  function download() {
    setError(null);
    start(async () => {
      const result = await planDownloadAction(form({}));
      if (result.url) window.location.href = result.url;
      else setError(result.error ?? t.couldNotOpen);
    });
  }

  async function upload(file: File) {
    setError(null);
    setNotice(null);
    // Refused here for speed; refused again on the server for real.
    if (!planExtension(file.name)) return setError(t.wrongType);
    if (file.size > MAX_PLAN_BYTES) return setError(t.tooBig);

    try {
      setStatus(t.uploading);
      const ticket = await createPlanUploadAction(
        form({ fileName: file.name, size: String(file.size) }),
      );
      if (!ticket.url || !ticket.key || !ticket.contentType) {
        return setError(ticket.error ?? t.uploadFailed);
      }
      const response = await fetch(ticket.url, {
        method: "PUT",
        headers: { "Content-Type": ticket.contentType },
        body: file,
      }).catch(() => null);
      if (!response?.ok) return setError(t.uploadFailed);

      setStatus(t.checking);
      const saved = await savePlanAction(form({ key: ticket.key, fileName: file.name }));
      if (saved.error) return setError(saved.error);
      setNotice(saved.notice ?? t.saved);
      router.refresh();
    } catch {
      setError(t.uploadFailed);
    } finally {
      setStatus(null);
      if (input.current) input.current.value = "";
    }
  }

  function remove() {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await deletePlanAction(form({}));
      setArmed(false);
      if (result.error) return setError(result.error);
      setNotice(result.notice ?? t.deleted);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {hasPlan ? (
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className={`${button} border border-line bg-surface-raised text-forest hover:border-leaf`}
          >
            <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.download}
          </button>
        ) : null}

        {canManage ? (
          <>
            {/* The native file button speaks the browser's language, not the
                site's — hidden, with a label in the page language in front. */}
            <input
              ref={input}
              id={inputId}
              type="file"
              accept={PLAN_ACCEPT}
              disabled={busy}
              className="peer sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <label
              htmlFor={inputId}
              className={`${button} cursor-pointer bg-forest text-cream hover:opacity-90 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest peer-disabled:cursor-not-allowed peer-disabled:opacity-60`}
            >
              <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 16V6m0 0-4 4m4-4 4 4M4 3h12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {hasPlan ? t.replaceFile : t.addFile}
            </label>

            {hasPlan && !armed ? (
              <button
                type="button"
                onClick={() => setArmed(true)}
                disabled={busy}
                className={`${button} text-danger-ink hover:underline`}
              >
                {t.delete}
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {armed ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-muted">{t.deleteQuestion}</span>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={`${button} bg-danger-solid text-white hover:opacity-90`}
          >
            {pending ? t.deleting : t.yesDelete}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="text-sm font-medium text-ink-muted hover:text-ink"
          >
            {t.cancel}
          </button>
        </div>
      ) : null}

      {status ? (
        <p role="status" className="text-xs text-ink-muted">
          {status}
        </p>
      ) : null}
      {notice && !status ? (
        <p role="status" className="text-xs font-medium text-success-ink">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
