import { CallView } from "@/components/CallView";

/**
 * Server component: static shell. Everything interactive lives in CallView,
 * which is a client component because it needs state, the microphone and WebRTC.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">
          Voice Freight Negotiator
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-50">
          Call the agent and try to talk it out of its price.
        </h1>
        <p className="max-w-2xl text-neutral-400">
          A LiveKit voice agent that negotiates a freight rate. The LLM chooses the words;
          the code decides every number.
        </p>
      </header>

      <CallView />
    </main>
  );
}
