import { OrbDemo } from "@/components/OrbDemo";

/**
 * /demo — the core running a scripted negotiation, no LiveKit needed.
 * Used for previews, screenshots and the article's illustrations.
 */
export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
          Voice Freight Negotiator · demo loop
        </p>
        <p className="max-w-xl text-sm text-neutral-500">
          A scripted call. Move the pointer to tilt the core, click to ping it. The carrier
          tries 3,250 and 4,000; the guardian blocks both; 2,900 is accepted.
        </p>
      </header>
      <OrbDemo />
    </main>
  );
}
