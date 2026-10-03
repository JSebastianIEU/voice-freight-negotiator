/**
 * The token route is the only place the LiveKit secret is used, so it is tested for what
 * the token allows: one fresh room, a short life, the right agent with the caller's load and
 * language, and nothing more. The token is verified with the same secret, as LiveKit would.
 */

import { TokenVerifier } from "livekit-server-sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loads } from "@/lib/catalog";

import { POST } from "./route";

const ENV = {
  LIVEKIT_URL: "wss://example.livekit.cloud",
  LIVEKIT_API_KEY: "APItestkey",
  LIVEKIT_API_SECRET: "test-secret-that-is-long-enough-for-hs256-signing",
};

function request(body?: unknown): Request {
  return new Request("http://localhost/api/token", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function issue(body?: unknown) {
  const res = await POST(request(body));
  const details = await res.json();
  const claims = await new TokenVerifier(ENV.LIVEKIT_API_KEY, ENV.LIVEKIT_API_SECRET).verify(
    details.participantToken,
  );
  const dispatch = claims.roomConfig?.agents?.[0];
  return { res, details, claims, dispatch, metadata: JSON.parse(dispatch?.metadata ?? "{}") };
}

describe("POST /api/token", () => {
  const saved = { ...process.env };
  beforeEach(() => Object.assign(process.env, ENV));
  afterEach(() => {
    process.env = { ...saved };
  });

  it("signs a token for one fresh room, with only the grants a caller needs", async () => {
    const { res, details, claims } = await issue({ loadId: loads[0].id });
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(details.serverUrl).toBe(ENV.LIVEKIT_URL);
    expect(details.roomName).toMatch(/^call-[0-9a-f]{8}$/);
    expect(claims.video).toMatchObject({
      room: details.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    expect(claims.video?.roomAdmin).toBeFalsy();
    expect(claims.video?.roomRecord).toBeFalsy();
    expect(claims.video?.roomList).toBeFalsy();
  });

  it("expires in fifteen minutes", async () => {
    const { claims } = await issue();
    expect((claims.exp ?? 0) - (claims.nbf ?? 0)).toBe(15 * 60);
  });

  it("sends the negotiator to the room with the load and the page language", async () => {
    const load = loads[loads.length - 1];
    const { details, dispatch, metadata } = await issue({ loadId: load.id, lang: "es" });
    expect(dispatch?.agentName).toBe("freight-negotiator");
    expect(metadata).toEqual({ loadId: load.id, lang: "es" });
    expect(details.loadId).toBe(load.id);
  });

  it("falls back to the first posted load and English for anything it does not know", async () => {
    for (const body of [undefined, { loadId: "NOT-A-LOAD", lang: "fr" }, { loadId: 42 }]) {
      const { metadata } = await issue(body);
      expect(metadata).toEqual({ loadId: loads[0].id, lang: "en" });
    }
  });

  it("gives every call its own room", async () => {
    const a = await issue();
    const b = await issue();
    expect(a.details.roomName).not.toBe(b.details.roomName);
    expect(a.details.participantIdentity).not.toBe(b.details.participantIdentity);
  });

  it("names a missing variable without ever echoing a secret", async () => {
    delete process.env.LIVEKIT_API_SECRET;
    const res = await POST(request());
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).toContain("LIVEKIT_API_SECRET");
    expect(text).not.toContain(ENV.LIVEKIT_API_KEY);
  });
});
