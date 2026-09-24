import type { ConnectionDetails } from "@/lib/types";

/**
 * Ask our own server for a room token. The browser never touches the LiveKit
 * secret; see app/api/token/route.ts for why.
 */
export async function fetchConnectionDetails(): Promise<ConnectionDetails> {
  const res = await fetch("/api/token", { method: "POST", cache: "no-store" });
  if (!res.ok) {
    let message = `Token request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // non-JSON error body: keep the status message
    }
    throw new Error(message);
  }
  return (await res.json()) as ConnectionDetails;
}
