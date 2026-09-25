"use client";

import Link from "next/link";

import { CallView } from "@/components/CallView";
import { LangToggle } from "@/components/LangToggle";
import { LangProvider, useLang } from "@/lib/i18n";

/** Header, the experience, footer; all under the language provider. */
export function AppShell() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  );
}

function Shell() {
  const { t } = useLang();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">{t("title")}</p>
        <div className="flex items-center gap-4">
          <Link
            href="/demo"
            className="font-mono text-xs text-neutral-500 underline-offset-4 hover:text-neutral-300 hover:underline"
          >
            {t("demoLoop")}
          </Link>
          <LangToggle />
        </div>
      </header>

      <CallView />

      <footer className="max-w-xl text-sm text-neutral-500">{t("footer")}</footer>
    </main>
  );
}
