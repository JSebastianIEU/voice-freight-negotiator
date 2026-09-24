/**
 * POST /api/token — mint a short-lived LiveKit room token for the browser.
 *
 * Why this runs on the server and not in the browser:
 * the LiveKit API secret can sign a token for *any* room with *any* permission.
 * If it shipped to the browser, anyone opening DevTools could join or record
 * every call on the project. So the browser asks this route handler for a token,
 * and the server, which is the only place the secret lives, signs one that is
 * scoped to a single fresh room and expires in minutes.
 *
 * The token also carries a RoomAgentDispatch: "when this room is created, send the
 * agent called <LIVEKIT_AGENT_NAME> to it". That is explicit dispatch, the mode
 * LiveKit recommends over the worker auto-joining every room. It matters here
 * because the test bench (milestone 6) adds a second agent, the fake carrier, and
 * the two must never land in the same room by accident.
 */

import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

import type { ConnectionDetails } from "@/lib/types";

// Tokens are single-use in practice (one call), so a short life limits the damage
// of a leaked one without getting in the way of a normal conversation.
const TOKEN_TTL = "15m";

export async function POST(): Promise<NextResponse> {
  const serverUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const agentName = process.env.LIVEKIT_AGENT_NAME ?? "freight-negotiator";

  if (!serverUrl || !apiKey || !apiSecret) {
    // Say which variable is missing, without echoing any value.
    const missing = [
      !serverUrl && "LIVEKIT_URL",
      !apiKey && "LIVEKIT_API_KEY",
      !apiSecret && "LIVEKIT_API_SECRET",
    ].filter(Boolean);
    return NextResponse.json(
      { error: `Server is missing ${missing.join(", ")}. Copy web/.env.example to web/.env.local.` },
      { status: 500 },
    );
  }

  // A fresh room per call keeps conversations isolated from each other.
  const suffix = crypto.randomUUID().slice(0, 8);
  const roomName = `call-${suffix}`;
  const participantIdentity = `carrier-${suffix}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: "Carrier",
    ttl: TOKEN_TTL,
  });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true, // the carrier's microphone
    canSubscribe: true, // the agent's voice
    canPublishData: true, // reserved for text input later
  });
  token.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName })],
  });

  const details: ConnectionDetails = {
    serverUrl,
    participantToken: await token.toJwt(),
    roomName,
    participantIdentity,
  };
  return NextResponse.json(details, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}
