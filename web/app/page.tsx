import Link from "next/link";

import { CallView } from "@/components/CallView";

/**
 * Server component: static shell. Everything interactive lives in CallView,
 * which is a client component because it needs state, the microphone and WebRTC.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
          Voice Freight Negotiator
        </p>
        <Link
          href="/demo"
          className="font-mono text-xs text-neutral-500 underline-offset-4 hover:text-neutral-300 hover:underline"
        >
          demo loop
        </Link>
      </header>

      <CallView />

      <footer className="max-w-xl text-sm text-neutral-500">
        A voice agent that negotiates a freight rate. The LLM chooses the words; the code
        decides every number. Try to talk it out of its price.
      </footer>
    </main>
  );
}
