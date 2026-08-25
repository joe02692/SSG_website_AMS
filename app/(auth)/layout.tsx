import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold text-ink"
          >
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-brand-700 text-xs font-bold text-white"
            >
              ES
            </span>
            El-Salam Scouting Group
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
