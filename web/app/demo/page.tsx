import { LaneDemo } from "@/components/LaneDemo";

/**
 * /demo — the lane running a scripted negotiation, no LiveKit needed.
 * Used for previews, screenshots and the article's illustrations.
 */
export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          Voice Freight Negotiator · demo loop
        </p>
        <p className="max-w-2xl text-sm text-neutral-500">
          A scripted call: the carrier tries 3,250 and 4,000, the guardian rejects both, 2,900
          is accepted. The min and max are never drawn; you only see prices hit the walls.
        </p>
      </header>
      <LaneDemo />
    </main>
  );
}
