"use client";

import { useLang } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "es" : "en")}
      aria-label={lang === "en" ? "Cambiar a español" : "Switch to English"}
      className="rounded-full border border-neutral-700 px-3 py-1 font-mono text-xs text-neutral-300 hover:border-neutral-500"
    >
      {t("langToggle")}
    </button>
  );
}
