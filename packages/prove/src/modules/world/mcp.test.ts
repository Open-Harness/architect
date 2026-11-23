// L2.08 (D3 #122): the remote MCP server of a real local world. An MCP client (the SDK's own) completes OAuth as ada,
// headless, and calls `allowance.get`; bob, who has no role on it, is refused with the refusal's code; a refusal carries its
// code; a secret never appears in a tool's input or answer.
import { acmeCopy } from "../../../test/acme.ts";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { UnauthorizedError, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Collectors } from "#modules/telemetry/service.js";
import { Worlds } from "./service.ts";

const project = acmeCopy();
const acme = project.root;
afterAll(project.remove);
const redirectUrl = "http://127.0.0.1:1/callback"; // nothing listens: the redirect is read, not followed

const provider = (captured: { url: URL | undefined }): OAuthClientProvider => {
  let tokens: OAuthTokens | undefined;
  let client: OAuthClientInformationMixed | undefined;
  let verifier = "";
  return {
    redirectUrl,
    clientMetadata: { client_name: "ortho l2.08", redirect_uris: [redirectUrl], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" },
    state: () => randomBytes(8).toString("hex"),
    clientInformation: () => client,
    saveClientInformation: (info) => { client = info; },
    tokens: () => tokens,
    saveTokens: (saved) => { tokens = saved; },
    redirectToAuthorization: (url) => { captured.url = url; },
    saveCodeVerifier: (v) => { verifier = v; },
    codeVerifier: () => verifier,
  };
};

const codeOf = (callback: string) => {
  const code = new URL(callback).searchParams.get("code");
  if (code === null) throw new Error(`the callback carried no code: ${callback}`);
  return code;
};

/** The authorization request followed as the person (D3 #16, the mcp-oauth spike): the JSON redirects, and the consent posted. */
const authorize = async (origin: string, authorization: URL, token: string): Promise<string> => {
  const headers = { authorization: `Bearer ${token}` };
  let next = authorization.toString();
  for (let hop = 0; hop < 8; hop++) {
    const response = await fetch(next, { redirect: "manual", headers });
    let where = response.headers.get("location") ?? "";
    if (where === "" && response.status === 200) {
      const body = (await response.json()) as { redirect?: boolean; url?: string };
      if (body.redirect && body.url) where = body.url;
    }
    if (where === "") throw new Error(`authorize answered ${response.status} with nowhere to go`);
    if (where.startsWith(redirectUrl)) return codeOf(where);
    if (new URL(where, origin).pathname === "/consent") {
      const consent = await fetch(`${origin}/api/auth/oauth2/consent`, {
        method: "POST", headers: { "content-type": "application/json", origin, ...headers }, body: JSON.stringify({ accept: true, oauth_query: new URL(where, origin).search.slice(1) }) });
      const body = (await consent.json()) as { url?: string };
      if (body.url?.startsWith(redirectUrl)) return codeOf(body.url);
      next = new URL(body.url ?? "", origin).toString();
      continue;
    }
    next = new URL(where, origin).toString();
  }
  throw new Error("too many redirects");
};

/** Connect to `<origin>/mcp` through OAuth as the person whose session token this is: registration, PKCE, consent, token. */
const connect = async (origin: string, session: string, headers: Record<string, string> = {}): Promise<Client> => {
  const captured: { url: URL | undefined } = { url: undefined };
  const auth = provider(captured);
  const first = new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), { authProvider: auth });
  try {
    await new Client({ name: "l2.08", version: "0.0.0" }).connect(first);
    throw new Error("the server let an unauthenticated client in");
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
  }
  await first.finishAuth(await authorize(origin, captured.url!, session));
  const client = new Client({ name: "l2.08", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), { authProvider: auth, requestInit: { headers } }));
  return client;
};

const textOf = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  (Array.isArray(result["content"]) ? (result["content"] as ReadonlyArray<{ text?: string }>) : []).map((p) => p.text ?? "").join("\n");

describe("the remote MCP server", () => {
  it("exports the first MCP operation to an extra Collector sink without a prior API call or local OTLP URL", { timeout: 180_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const dir = yield* Effect.acquireRelease(
        Effect.sync(() => mkdtempSync(join(realpathSync(tmpdir()), "ortho-mcp-telemetry-"))),
        (path) => Effect.sync(() => rmSync(path, { recursive: true, force: true })),
      );
      const collector = yield* Collectors.start(dir);
      const sinks = [{ id: "extra-collector", traces: { url: `${collector.url}/v1/traces`, headers: {} }, logs: { url: `${collector.url}/v1/logs`, headers: {} } }];
      const { url } = yield* Worlds.start({ root: acme, port: 0, name: "mcp-first-telemetry", environment: "local", secretEnv: { OTLP_SINKS: JSON.stringify(sinks) } });

      // Only Better Auth and OAuth run before the tool: no cast, ordinary operation or telemetry configuration call.
      const session = yield* Effect.promise(() => fetch(`${url}/api/auth/sign-up/email`, {
        method: "POST", headers: { "content-type": "application/json", origin: url },
        body: JSON.stringify({ name: "First MCP", email: "first-mcp@orthograph.test", password: randomBytes(16).toString("hex") }),
      }).then(async (response) => {
        expect(response.status).toBe(200);
        return (await response.json()) as { token: string };
      }));
      const trace = randomBytes(16).toString("hex");
      const parent = randomBytes(8).toString("hex");
      const client = yield* Effect.promise(() => connect(url, session.token, { traceparent: `00-${trace}-${parent}-01` }));
      yield* Effect.addFinalizer(() => Effect.promise(() => client.close()));
      const result = yield* Effect.promise(() => client.callTool({ name: "system.health", arguments: {} }));
      expect(result["isError"]).toBeFalsy();
      expect(textOf(result)).toContain("ok");
      const traces = yield* collector.traces([{ trace, parent }]);
      expect(traces.get(trace)?.spans.some((span) => span.name === "system.health")).toBe(true);

      // The public reader omits resource attributes; inspect the real Collector's raw OTLP export for this trace.
      type Batch = { resource?: { attributes?: Array<{ key: string; value: { stringValue?: string } }> }; scopeSpans: Array<{ spans: Array<{ traceId: string; name: string }> }> };
      const batches = readFileSync(join(dir, "traces.jsonl"), "utf8").split("\n").filter(Boolean)
        .flatMap((line) => (JSON.parse(line) as { resourceSpans: Array<Batch> }).resourceSpans);
      const operation = batches.find((batch) => batch.scopeSpans.some((scope) => scope.spans.some((span) => span.traceId === trace && span.name === "system.health")));
      expect(operation?.resource?.attributes?.find((attribute) => attribute.key === "deployment.environment")?.value.stringValue).toBe("local");
      expect(operation?.resource?.attributes?.find((attribute) => attribute.key === "deployment.environment.name")?.value.stringValue).toBe("local");
    }))));

  it("serves one tool per operation and read an agent may call, behind OAuth, as the agent for the person the token names", { timeout: 180_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { url } = yield* Worlds.start({ root: acme, port: 0, name: "mcp-test" });
      const post = (path: string, body: unknown, token?: string, headers: Record<string, string> = {}) =>
        Effect.promise(() => fetch(`${url}${path}`, {
          method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body),
        }).then(async (r) => ({ status: r.status, headers: r.headers, body: (await r.json().catch(() => ({}))) as Record<string, unknown> })));
      const cast = (yield* post("/_world/cast", { names: ["ada", "olga", "bob"] })).body as Record<string, { person: string; token: string; email: string; password: string }>;
      const [ada, olga, bob] = [cast["ada"]!, cast["olga"]!, cast["bob"]!];
      const organization = (yield* post("/organization/create", { name: "Acme Demo", cap: "1000" }, ada.token)).body["organization"];
      const allowance = (yield* post("/allowance/grant", { organization, member: olga.person, limit: "500" }, ada.token)).body["allowance"];

      // Without a token: a 401 that says where a client finds out how to get one.
      const none = yield* post("/mcp", {});
      expect(none.status).toBe(401);
      expect(none.headers.get("www-authenticate")).toBe(`Bearer resource_metadata="${url}/.well-known/oauth-protected-resource"`);
      const forged = yield* post("/mcp", {}, "eyJhbGciOiJFZERTQSJ9.e30.AAAA");
      expect([forged.status, forged.headers.get("www-authenticate")]).toEqual([401, `Bearer resource_metadata="${url}/.well-known/oauth-protected-resource", error="invalid_token"`]);
      const resource = (yield* Effect.promise(() => fetch(`${url}/.well-known/oauth-protected-resource`).then((r) => r.json()))) as Record<string, unknown>;
      expect([resource["resource"], resource["authorization_servers"]]).toEqual([`${url}/mcp`, [`${url}/api/auth`]]);
      const server = (yield* Effect.promise(() => fetch(`${url}/.well-known/oauth-authorization-server/api/auth`).then((r) => r.json()))) as Record<string, unknown>;
      expect(server["registration_endpoint"]).toBe(`${url}/api/auth/oauth2/register`);
      const asAda = yield* Effect.promise(() => connect(url, ada.token));
      const asBob = yield* Effect.promise(() => connect(url, bob.token));
      yield* Effect.addFinalizer(() => Effect.promise(() => Promise.all([asAda.close(), asBob.close()]).then(() => undefined)));

      // One tool per operation and read an agent may call (the model's `agentTool`), named as the operation is, each with the model's own input.
      const { tools } = yield* Effect.promise(() => asAda.listTools());
      const model = JSON.parse(readFileSync(join(acme, "generated/model/model.json"), "utf8")) as { operations: Record<string, { kind: string; agentTool: boolean }> };
      expect(tools.map((t) => t.name).sort()).toEqual(Object.entries(model.operations).filter(([, o]) => o.agentTool).map(([name]) => name).sort());
      // Consent and a new credential are a person's own: no tool offers either.
      expect(tools.map((t) => t.name)).not.toContain("invitation.accept");
      expect(tools.map((t) => t.name)).not.toContain("api-key.create");
      const get = tools.find((t) => t.name === "allowance.get")!;
      expect(get.inputSchema).toMatchObject({ type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false });
      expect(get.annotations?.readOnlyHint).toBe(true);
      expect(tools.find((t) => t.name === "allowance.grant")!.annotations?.readOnlyHint).toBeUndefined();
      // Only public fields: the password is not an input of sign-in, and no tool offers a secret.
      expect(Object.keys((tools.find((t) => t.name === "session.sign-in")!.inputSchema as { properties: object }).properties)).toEqual(["email"]);

      // Ada gets the typed answer, as one line of JSON, bigints as text.
      const read = yield* Effect.promise(() => asAda.callTool({ name: "allowance.get", arguments: { id: allowance } }));
      expect(read["isError"]).toBeFalsy();
      expect(JSON.parse(textOf(read))).toEqual({ organization, member: olga.person, limit: "500", spent: "0", state: "active" });
      expect(read["structuredContent"]).toEqual({ organization, member: olga.person, limit: "500", spent: "0", state: "active" });

      // Bob has no role on it: the same refusal as the API's, with its code.
      const refused = yield* Effect.promise(() => asBob.callTool({ name: "allowance.get", arguments: { id: allowance } }));
      expect([refused["isError"], textOf(refused)]).toEqual([true, "[AR-001] NotAllowed"]);

      // A declared refusal comes back as a tool error with its code and its public fields.
      const over = yield* Effect.promise(() => asAda.callTool({ name: "allowance.grant", arguments: { organization, member: olga.person, limit: "1001" } }));
      expect([over["isError"], textOf(over)]).toEqual([true, "[AL-003] AllowanceLimitTooHigh { cap: 1000 }"]);

      // An agent is no one to make a key: it is not shown the tool, and naming it anyway is refused as the API refuses it, so no secret is an answer.
      const made = yield* Effect.promise(() => asAda.callTool({ name: "api-key.create", arguments: { organization, name: "ci" } }));
      expect([made["isError"], textOf(made)]).toEqual([true, "[AR-001] NotAllowed"]);
      // And a secret can't be sent: the secret input is not in the tool, and naming it anyway is refused.
      const signedIn = yield* Effect.promise(() => asAda.callTool({ name: "session.sign-in", arguments: { email: ada.email, password: ada.password } }));
      expect(signedIn["isError"]).toBe(true);
      expect(textOf(signedIn)).not.toContain("token");
    }))));
});
