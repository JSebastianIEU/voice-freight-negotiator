"use client";

import { useLang, type StringKey } from "@/lib/i18n";
import { STAGES, type Stage, stageIndex } from "@/lib/stages";

const LABEL: Record<Stage, StringKey> = {
  identify: "stageIdentify",
  qualify: "stageQualify",
  load: "stageLoad",
  negotiate: "stageNegotiate",
  close: "stageClose",
};

/** Five dots, one per step of a broker call; the current one glows. */
export function Stages({ stage }: { stage: Stage }) {
  const { t } = useLang();
  const current = stageIndex(stage);
  return (
    <ol aria-label={t("stages")} className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
      {STAGES.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                now ? "bg-amber-300" : done ? "bg-neutral-300" : "bg-neutral-700"
              }`}
            />
            <span className={now ? "text-amber-200" : done ? "text-neutral-300" : "text-neutral-600"}>
              {t(LABEL[s])}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
