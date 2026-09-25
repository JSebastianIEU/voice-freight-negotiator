import { Experience } from "@/components/experience/Experience";

/**
 * Server component: a static shell. Everything interactive lives in Experience, a client
 * component because it needs state, the language, the pointer, the microphone and WebRTC.
 */
export default function Home() {
  return <Experience />;
}
