"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPlanUploadAction,
  deletePlanAction,
  planDownloadAction,
  purgePlanAction,
  savePlanAction,
} from "@/app/seasonal-plan/actions";
import { MAX_PLAN_BYTES, PLAN_ACCEPT, planExtension } from "@/lib/seasonal-plan-rules";
import { useT } from "@/lib/i18n/client";

const button =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60";

type Words = ReturnType<typeof useT>["pages"]["seasonal"];

/**
 * Uploads one Excel file for a stage — as a new file, or in place of
 * `replace` (a current file name). The server re-checks who is asking, the
 * file, and the three-files limit.
 */
function usePlanUpload(stage: string, t: Words, replace?: string) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function form(values: Record<string, string>) {
    const data = new FormData();
    data.set("stage", stage);
    if (replace) data.set("replace", replace);
    for (const [k, v] of Object.entries(values)) data.set(k, v);
    return data;
  }

  async function upload(file: File) {
    setError(null);
    setNotice(null);
    if (!planExtension(file.name)) return setError(t.wrongType);
    if (file.size > MAX_PLAN_BYTES) return setError(t.tooBig);
    try {
      setStatus(t.uploading);
      const ticket = await createPlanUploadAction(form({ fileName: file.name, size: String(file.size) }));
      if (!ticket.url || !ticket.key || !ticket.contentType) return setError(ticket.error ?? t.uploadFailed);
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
    }
  }

  return { upload, status, error, notice, setError, setNotice };
}

function Messages({ status, notice, error }: { status: string | null; notice: string | null; error: string | null }) {
  return (
    <>
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
    </>
  );
}

/** A hidden file input with a visible label in the page language. */
function FilePicker({
  label,
  disabled,
  onFile,
  primary,
}: {
  label: string;
  disabled: boolean;
  onFile: (file: File) => void;
  primary?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      {/* The native file button speaks the browser's language, not the
          site's — hidden, with a label in the page language in front. */}
      <input
        ref={input}
        id={id}
        type="file"
        accept={PLAN_ACCEPT}
        disabled={disabled}
        className="peer sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          if (input.current) input.current.value = "";
        }}
      />
      <label
        htmlFor={id}
        className={`${button} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${
          primary ? "bg-forest text-cream hover:opacity-90" : "border border-line bg-surface-raised text-forest hover:border-leaf"
        }`}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 16V6m0 0-4 4m4-4 4 4M4 3h12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </label>
    </>
  );
}

/** "Add file" for a stage that has fewer than the maximum. */
export function AddPlanFile({ stage, count, max }: { stage: string; count: number; max: number }) {
  const t = useT().pages.seasonal;
  const { upload, status, error, notice } = usePlanUpload(stage, t);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {count < max ? (
          <FilePicker label={t.addFile} primary disabled={status !== null} onFile={(f) => void upload(f)} />
        ) : null}
        <span className="text-xs text-ink-muted">{t.filesCount(count, max)}</span>
      </div>
      <Messages status={status} notice={notice} error={error} />
    </div>
  );
}

/**
 * The buttons under one file: Download (every leader); Replace and Archive
 * (that stage's admins + the head site admin); Delete for good (head site
 * admin only).
 */
export function PlanFileControls({
  stage,
  file,
  canManage,
  canPurge = false,
}: {
  stage: string;
  /** The file's name in the stage folder. */
  file: string;
  canManage: boolean;
  canPurge?: boolean;
}) {
  const t = useT().pages.seasonal;
  const router = useRouter();
  const replaceUpload = usePlanUpload(stage, t, file);
  const [armed, setArmed] = useState<"archive" | "purge" | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = pending || replaceUpload.status !== null;

  function form() {
    const data = new FormData();
    data.set("stage", stage);
    data.set("file", file);
    return data;
  }

  function download() {
    setError(null);
    start(async () => {
      const result = await planDownloadAction(form());
      if (result.url) window.location.href = result.url;
      else setError(result.error ?? t.couldNotOpen);
    });
  }

  function confirm() {
    const which = armed;
    setError(null);
    setNotice(null);
    start(async () => {
      const result = which === "purge" ? await purgePlanAction(form()) : await deletePlanAction(form());
      setArmed(null);
      if (result.error) return setError(result.error);
      setNotice(result.notice ?? (which === "purge" ? t.purged : t.deleted));
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5">
      {!armed ? (
        <div className="flex flex-wrap items-center gap-1.5">
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
          {canManage ? (
            <>
              <FilePicker label={t.replaceThis} disabled={busy} onFile={(f) => void replaceUpload.upload(f)} />
              <button
                type="button"
                onClick={() => setArmed("archive")}
                disabled={busy}
                className={`${button} text-danger-ink hover:underline`}
              >
                {t.delete}
              </button>
            </>
          ) : null}
          {canPurge ? (
            <button
              type="button"
              onClick={() => setArmed("purge")}
              disabled={busy}
              className={`${button} border border-danger-ink/40 text-danger-ink hover:bg-danger-ink/5`}
            >
              <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h12M8 6V4h4v2m-6 0 .7 10h6.6L14 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.purge}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={armed === "purge" ? "font-medium text-danger-ink" : "text-ink-muted"}>
            {armed === "purge" ? t.purgeQuestion : t.deleteQuestion}
          </span>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`${button} bg-danger-solid text-white hover:opacity-90`}
          >
            {pending ? (armed === "purge" ? t.purging : t.deleting) : armed === "purge" ? t.yesPurge : t.yesDelete}
          </button>
          <button type="button" onClick={() => setArmed(null)} className="text-sm font-medium text-ink-muted hover:text-ink">
            {t.cancel}
          </button>
        </div>
      )}
      <Messages status={replaceUpload.status} notice={notice ?? replaceUpload.notice} error={error ?? replaceUpload.error} />
    </div>
  );
}
