// Check 43 (M2.03, found by the review of #297): no agent credential turns into a person's, or into another credential, through any door. Written by the checks
// author; a builder never edits this file (AGENTS.md, "Journeys and checks come first"). It lands with the M2.03 pair (`design/decisions/G12-paired-landing.md`).
//
// THE HOLE. `enableSessionForAPIKeys: true` (host-cloudflare `auth/internal/options.ts`) lets a key stand for a session at Better Auth's own routes, and `/api/auth/*`
// is open in every environment, so `POST /api/auth/api-key/create` sent with an agent's `x-api-key` makes a new `ak_` key with no `acts` mark: a person by key, which
// passes `.notVia(Via.agent)` on `invitation.accept` and `.via(Via.session, Via.device)`'s neighbours. M2-auth, fork 2: "a key made for an agent is an agent".
//
// WHAT IS REQUIRED, in one real world of acme (workerd, no Docker), with Olga's agent key from the world's `/_world/credential` and Ada as the owner of an organisation
// that invited Olga. A credential an agent makes, by any route, is refused or still reads as an agent; `invitation.accept` with it is refused; no route hands the agent
// a person's session or lets the key rewrite its own mark; the API's `api-key.create` and MCP refuse the agent; and the control, which must keep passing, is that a
// person's own session still mints a key (a person by key) and Olga herself still accepts after every attempt.
//   "reads as an agent" is judged by `session.show`'s `via`, which is "agent" only for an agent's credential (check 42).
// The routes tried are Better Auth's (`/api/auth/api-key/create`, `.../update`, `.../list`, `/api/auth/get-session`), the API's (`/api-key/create`, `/invitation/accept`)
// and MCP (`/mcp`: `tools/list`, `tools/call`). Any other `/api/auth/*` route that mints or upgrades a credential belongs here too: add it as a row, with the plant.
//
// Red today for one reason: the Better Auth route makes a person's key from an agent's (the second and third tests). The others are controls or hold already.
import { cpSync } from "node:fs";
import { Effect } from "effect";
import { Worlds } from "@orthograph/prove";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { acme, copyOf, nothingRunning } from "../layer1/support.ts";
import { freePorts } from "../ports.ts";

const PORT = freePorts("world").world;
const copy = copyOf(acme);
afterAll(copy.remove);
void cpSync;

interface Answer { readonly status: number; readonly body: unknown }
const asText = (x: unknown) => (typeof x === "string" ? x : (JSON.stringify(x) ?? "nothing"));

/** Everything the scenario observed, gathered once in one world: each test below reads its own part. */
interface Seen {
  readonly agentShows: Answer;
  readonly route: Answer;
  readonly mintedShows: Answer | undefined;
  readonly mintedAccepts: Answer | undefined;
  readonly session: Answer;
  readonly sessionTokenShows: Answer | undefined;
  readonly sessionTokenAccepts: Answer | undefined;
  readonly markBefore: Answer;
  readonly update: Answer;
  readonly agentShowsAfterUpdate: Answer;
  readonly agentAcceptsAfterUpdate: Answer;
  readonly apiKeyCreateAsAgent: Answer;
  readonly mcpTools: ReadonlyArray<string>;
  readonly mcpAccept: Answer;
  readonly mcpKey: Answer;
  readonly personMints: Answer;
  readonly personKeyShows: Answer | undefined;
  readonly olgaAccepts: Answer;
}
let seen: Seen;

const gather = (url: string) => Effect.promise(async (): Promise<Seen> => {
  const send = async (path: string, init: { readonly method?: string; readonly token?: string; readonly key?: string; readonly body?: unknown } = {}): Promise<Answer> => {
    const response = await fetch(`${url}${path}`, {
      method: init.method ?? "POST",
      headers: { "content-type": "application/json", ...(init.token ? { authorization: `Bearer ${init.token}` } : {}), ...(init.key ? { "x-api-key": init.key } : {}) },
      ...(init.method === "GET" ? {} : { body: JSON.stringify(init.body ?? {}) }),
    });
    const text = await response.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* not JSON */ }
    return { status: response.status, body };
  };
  const field = (a: Answer | undefined, name: string): string | undefined => {
    const value = typeof a?.body === "object" && a.body !== null ? (a.body as Record<string, unknown>)[name] : undefined;
    return typeof value === "string" ? value : undefined;
  };
  const mint = async (name: string, via: "agent" | "key") => (await send("/_world/credential", { body: { name, via } })).body as { token: string };

  const cast = (await send("/_world/cast", { body: { names: ["ada", "olga"] } })).body as Record<string, { token: string; email: string }>;
  const made = await send("/organization/create", { token: cast["ada"]!.token, body: { name: "Acme Demo", cap: "1000" } });
  const organization = field(made, "organization")!;
  const invited = await send("/invitation/send", { token: cast["ada"]!.token, body: { organization, email: cast["olga"]!.email } });
  const invitation = field(invited, "invitation")!;
  // A key is rate-limited by Better Auth (ten calls), so each group of probes below gets an agent key of its own.
  const agentKey = async () => (await mint("olga", "agent")).token;
  const adaAgent = (await mint("ada", "agent")).token;
  const show = (credential: string) => send("/session/show", { token: credential });
  const accept = (credential: string) => send("/invitation/accept", { token: credential, body: { invitation } });

  const agentShows = await show(await agentKey());
  // 1. Better Auth's own route, with the agent's key standing for a session.
  const route = await send("/api/auth/api-key/create", { key: await agentKey(), body: { name: "escalated" } });
  const minted = field(route, "key");
  const mintedShows = minted ? await show(minted) : undefined;
  const mintedAccepts = minted ? await accept(minted) : undefined;
  // 2. The session the key stands for: if the route hands out a token, it must not be a person's.
  const session = await send("/api/auth/get-session", { method: "GET", key: await agentKey() });
  const session2 = typeof session.body === "object" && session.body !== null ? (session.body as { session?: { token?: unknown } }).session : undefined;
  const sessionToken = typeof session2?.token === "string" ? session2.token : undefined;
  const sessionTokenShows = sessionToken ? await show(sessionToken) : undefined;
  const sessionTokenAccepts = sessionToken ? await accept(sessionToken) : undefined;
  // 3. The key rewriting its own mark.
  const markKey = await agentKey();
  const listed = await send("/api/auth/api-key/list", { method: "GET", key: markKey });
  const keys = Array.isArray(listed.body) ? listed.body as ReadonlyArray<{ id?: string }> : Array.isArray((listed.body as { apiKeys?: unknown })?.apiKeys) ? (listed.body as { apiKeys: ReadonlyArray<{ id?: string }> }).apiKeys : [];
  const keyId = keys[0]?.id;
  const update = await send("/api/auth/api-key/update", { key: markKey, body: { keyId: keyId ?? "none", metadata: {} } });
  const agentShowsAfterUpdate = await show(markKey);
  const agentAcceptsAfterUpdate = await accept(markKey);
  // 4. The API's own door.
  const apiKeyCreateAsAgent = await send("/api-key/create", { token: adaAgent, body: { organization, name: "by an agent" } });
  // 5. MCP: the agent's tools, and a call to what it must not reach.
  const mcpKeyToken = await agentKey();
  const rpc = async (method: string, params: object) => {
    const response = await fetch(`${url}/mcp`, {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${mcpKeyToken}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const text = await response.text();
    try { return { status: response.status, body: JSON.parse(text.replace(/^data: /m, "")) as unknown }; } catch { return { status: response.status, body: text }; }
  };
  const tools = ((await rpc("tools/list", {})).body as { result?: { tools?: ReadonlyArray<{ name: string }> } }).result?.tools?.map((t) => t.name) ?? [];
  const call = async (name: string, args: object): Promise<Answer> => {
    const r = await rpc("tools/call", { name, arguments: args });
    const result = (r.body as { result?: { isError?: boolean } }).result;
    return { status: result?.isError === true ? 403 : r.status, body: r.body };
  };
  const mcpAccept = await call("invitation.accept", { invitation });
  const mcpKey = await call("api-key.create", { organization, name: "by an agent over mcp" });
  // The control: a person's own session mints a key, and it is a person's by key.
  const personMints = await send("/api-key/create", { token: cast["ada"]!.token, body: { organization, name: "ci" } });
  const personKey = field(personMints, "key");
  const personKeyShows = personKey ? await show(personKey) : undefined;
  // And Olga herself still accepts, which says the invitation was never consumed by anything above.
  const olgaAccepts = await accept(cast["olga"]!.token);
  return { agentShows, route, mintedShows, mintedAccepts, session, sessionTokenShows, sessionTokenAccepts, markBefore: listed, update, agentShowsAfterUpdate, agentAcceptsAfterUpdate,
    apiKeyCreateAsAgent, mcpTools: tools, mcpAccept, mcpKey, personMints, personKeyShows, olgaAccepts };
});

beforeAll(async () => {
  seen = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const world = yield* Worlds.start({ root: copy.root, port: PORT, name: "m1-no-agent-escalation" });
    return yield* gather(world.url);
  })));
}, 600_000);

const via = (a: Answer | undefined) => (typeof a?.body === "object" && a.body !== null ? (a.body as { via?: unknown }).via : undefined);
const refused = (a: Answer | undefined) => a !== undefined && a.status >= 400;

describe("43 control: the instruments", () => {
  it("an agent's key reads as an agent at `session.show`, and leaves nothing running", () => {
    expect(seen.agentShows.status, asText(seen.agentShows.body)).toBe(200);
    expect(via(seen.agentShows)).toBe("agent");
    nothingRunning(copy.root);
  });
});

describe("43 M2.03: Better Auth's routes, with an agent's key", () => {
  it("`POST /api/auth/api-key/create` is refused, or the key it makes still reads as an agent", () => {
    const outcome = `the route answered ${seen.route.status} ${asText(seen.route.body).slice(0, 160)}; the key it made reads as ${String(via(seen.mintedShows))}`;
    expect(refused(seen.route) || via(seen.mintedShows) === "agent", outcome).toBe(true);
  });

  it("`invitation.accept` with a key an agent made is refused", () => {
    // No key made, nothing to accept with: the route refused. Otherwise the accept must be.
    expect(seen.mintedAccepts === undefined || refused(seen.mintedAccepts), `accepted with a key the agent made: ${asText(seen.mintedAccepts?.body).slice(0, 160)}`).toBe(true);
  });

  it("`GET /api/auth/get-session` hands the agent no session token that reads as a person's, or accepts for her", () => {
    expect(via(seen.sessionTokenShows) === undefined || via(seen.sessionTokenShows) === "agent", `a token from the route reads as ${String(via(seen.sessionTokenShows))}`).toBe(true);
    expect(seen.sessionTokenAccepts === undefined || refused(seen.sessionTokenAccepts), "accepted with a token the route handed out").toBe(true);
  });

  it("`POST /api/auth/api-key/update` cannot clear the agent's mark: the key still reads as an agent and still can't accept", () => {
    expect(via(seen.agentShowsAfterUpdate), `after update (${seen.update.status}), the key reads as ${String(via(seen.agentShowsAfterUpdate))}`).toBe("agent");
    expect(refused(seen.agentAcceptsAfterUpdate), "accepted with the agent's key after update").toBe(true);
  });
});

describe("43 M2.03: the API and MCP, with an agent's credential", () => {
  it("the API's `api-key.create` refuses an agent (NotAllowed)", () => {
    expect(seen.apiKeyCreateAsAgent.status, asText(seen.apiKeyCreateAsAgent.body).slice(0, 200)).toBeGreaterThanOrEqual(400);
    expect(asText(seen.apiKeyCreateAsAgent.body)).toContain("NotAllowed");
  });

  it("MCP lists neither `api-key.create` nor `invitation.accept` to the agent, lists `invitation.send`, and refuses a call to each", () => {
    expect(seen.mcpTools, "the agent's tools").toContain("invitation.send");
    expect(seen.mcpTools).not.toContain("api-key.create");
    expect(seen.mcpTools).not.toContain("invitation.accept");
    expect(refused(seen.mcpAccept), `a call to invitation.accept over MCP: ${asText(seen.mcpAccept.body).slice(0, 160)}`).toBe(true);
    expect(refused(seen.mcpKey), `a call to api-key.create over MCP: ${asText(seen.mcpKey.body).slice(0, 160)}`).toBe(true);
  });
});

describe("43 control: a person is not locked out by any of it", () => {
  it("a person's own session still mints a key through `api-key.create`, and the key is a person's by key", () => {
    expect(seen.personMints.status, asText(seen.personMints.body).slice(0, 200)).toBe(200);
    expect(via(seen.personKeyShows)).toBe("key");
  });

  it("Olga herself still accepts her invitation after every attempt above: nothing consumed it", () => {
    expect(seen.olgaAccepts.status, asText(seen.olgaAccepts.body).slice(0, 200)).toBe(200);
  });
});
