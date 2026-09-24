/** What the agent is doing, as the UI sees it. Derived from LiveKit's AgentState. */
export type AgentPhase =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "failed";
