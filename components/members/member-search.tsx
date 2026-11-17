"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { normalizeSearch } from "@/lib/search";

/**
 * Search box over the Admin members table (validation feedback, 17 Nov 2026).
 * The table is rendered on the server; this only hides the rows that don't
 * match. Each row carries its searchable text in data-search (already
 * normalised with normalizeSearch).
 */
export function MemberSearch({ tableId, total }: { tableId: string; total: number }) {
  const t = useT().members.page;
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(total);

  function apply(value: string) {
    setQuery(value);
    const needle = normalizeSearch(value);
    const rows = document.querySelectorAll<HTMLTableRowElement>(`#${tableId} tbody tr[data-search]`);
    let count = 0;
    rows.forEach((row) => {
      const match = !needle || (row.dataset.search ?? "").includes(needle);
      row.hidden = !match;
      if (match) count++;
    });
    setShown(count);
  }

  return (
    <div className="mt-4">
      <label className="relative block max-w-md">
        <span className="sr-only">{t.search}</span>
        <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => apply(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-xl border-2 border-line bg-surface-raised py-2.5 pe-3 ps-10 text-sm text-ink outline-none transition focus:border-leaf"
        />
      </label>
      <p aria-live="polite" className="mt-1.5 text-xs text-ink-muted">
        {query ? (shown === 0 ? t.noMatches : t.searchCount(shown, total)) : null}
      </p>
    </div>
  );
}
