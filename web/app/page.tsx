import Link from "next/link";

import { CallView } from "@/components/CallView";

/**
 * Server component: static shell. Everything interactive lives in CallView,
 * which is a client component because it needs state, the microphone and WebRTC.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
            Voice Freight Negotiator
          </p>
          <Link
            href="/demo"
            className="font-mono text-xs text-neutral-500 underline-offset-4 hover:text-neutral-300 hover:underline"
          >
            demo loop
          </Link>
        </div>
        <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
          Every price the agent wants to say has to land on this lane first.
        </h1>
        <p className="max-w-2xl text-sm text-neutral-400">
          The LLM chooses the words; the code decides every number. The limits are never
          drawn — you only see prices hit them.
        </p>
      </header>

      <CallView />
    </main>
  );
}
