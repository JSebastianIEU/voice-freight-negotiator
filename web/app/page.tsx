import { AppShell } from "@/components/AppShell";

/**
 * Server component: static shell. Everything interactive lives in AppShell, a client
 * component because it needs state, the language, the microphone and WebRTC.
 */
export default function Home() {
  return <AppShell />;
}
