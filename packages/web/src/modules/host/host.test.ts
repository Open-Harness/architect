// The host: a piece's send is the generated action's call through the client's layer, decoded by the action's own schema, as the caller, with the
// approval the press already is; a refusal is a value; a write that finishes tells the reads it concerns.
import { Context, Effect, Layer, Schema } from "effect";
import { FetchHttpClient } from "effect/http";
import { describe, expect, it } from "vitest";
import type { ActionHost, ActionOptions } from "orthograph/actions";
import { WebHost } from "./service.ts";
import type { Outcome, SendCallback } from "./types.ts";

class Fake extends Context.Service<Fake, { readonly claim: (name: string) => Effect.Effect<{ readonly handle: string }, { readonly _tag: "Taken"; readonly code: string }> }>()("fake/Client") {}
const taken = { _tag: "Taken", code: "HN-001" } as const;
const layer = (calls: Array<string>) => Layer.succeed(Fake, { claim: (name) => (calls.push(name), name === "held" ? Effect.fail(taken) : Effect.succeed({ handle: `hdl_${name}` })) });

const options = (extra: Partial<ActionOptions<{ readonly name: string }, { readonly handle: string }>> = {}) => (host: ActionHost<Fake["Service"]>): ActionOptions<{ readonly name: string }, { readonly handle: string }> => ({
  name: "handle.claim",
  description: "Claim a name.",
  schema: Schema.Struct({ name: Schema.String.check(Schema.isPattern(/^[a-z]+$/)) }) as never,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { Taken: "HN-001" },
  run: (args, ctx) => host.call((client) => client.claim(args.name), ctx),
  ...extra,
});

const send = (wire: ReturnType<WebHost["wire"]>, payload: Record<string, unknown>, source = "mouse", requestKey?: string): Promise<Outcome<unknown>> =>
  new Promise((settle) => (wire.onSend as SendCallback)(payload, { reason: "submit-press", source, requestKey, settle: (sent) => void sent.then(settle) }));

describe("WebHost", () => {
  it("sends the payload the form held through the client, and settles with the answer", async () => {
    const calls: Array<string> = [];
    const host = WebHost.make({ client: layer(calls), ask: () => Promise.reject(new Error("a piece never asks")) });
    expect(await send(host.wire(options()), { name: "ada" })).toEqual({ ok: true, answer: { handle: "hdl_ada" } });
    expect(calls).toEqual(["ada"]);
  });

  it("settles a declared refusal as a value with its declared name and code, and nothing else of it", async () => {
    const host = WebHost.make({ client: layer([]), ask: () => Promise.resolve(true) });
    expect(await send(host.wire(options()), { name: "held" })).toMatchObject({ ok: false, refusal: { name: "Taken", code: "HN-001", known: true } });
  });

  it("refuses a payload the action's schema refuses before anything is sent", async () => {
    const calls: Array<string> = [];
    const host = WebHost.make({ client: layer(calls), ask: () => Promise.resolve(true) });
    expect(await send(host.wire(options()), { name: "Not A Name!" })).toMatchObject({ ok: false, refusal: { name: "InvalidPayload" } });
    expect(calls).toEqual([]);
  });

  it("a piece's press is the yes: an action that needs approval is not asked about, and the page's own call of it is", async () => {
    let asked = 0;
    const host = WebHost.make({ client: layer([]), ask: () => (asked += 1, Promise.resolve(false)) });
    const needing = options({ needsApproval: true });
    expect(await send(host.wire(needing), { name: "ada" })).toMatchObject({ ok: true });
    expect(asked).toBe(0);
    const refused = await host.action(needing).run({ name: "ada" }, { caller: "person" }).then(() => undefined, (e: unknown) => e);
    expect(asked).toBe(1);
    expect(refused).toMatchObject({ errorCode: "AR-007", noWrite: true });
  });

  it("tells the reads of a thing when a write on it finishes, and not when it was refused or only read", async () => {
    const host = WebHost.make({ client: layer([]), ask: () => Promise.resolve(true) });
    let told = 0;
    const stop = host.onFinished(["handle"], () => (told += 1));
    await send(host.wire(options()), { name: "ada" });
    expect(told).toBe(1);
    await send(host.wire(options()), { name: "held" });
    await send(host.wire(options({ readOnly: true })), { name: "bob" });
    expect(told).toBe(1);
    stop();
    await send(host.wire(options()), { name: "cy" });
    expect(told).toBe(1);
  });

  it("marks each request with who pressed and with the form's request key", async () => {
    const seen: Array<{ readonly source: string | null; readonly key: string | null }> = [];
    const original = globalThis.fetch;
    globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen.push({ source: headers.get("x-ortho-source"), key: headers.get("idempotency-key") });
      return Promise.resolve(new Response("{}"));
    }) as typeof fetch;
    try {
      const viaFetch = Layer.succeed(Fake, { claim: () => Effect.flatMap(Effect.service(FetchHttpClient.Fetch), (fetch) => Effect.promise(() => fetch("http://x/", {})).pipe(Effect.as({ handle: "hdl_x" }))) });
      const host = WebHost.make({ client: viaFetch, ask: () => Promise.resolve(true) });
      await send(host.wire(options()), { name: "ada" }, "agent", "k1");
      await send(host.wire(options()), { name: "ada" }, "mouse", "k2");
    } finally {
      globalThis.fetch = original;
    }
    expect(seen).toEqual([{ source: "agent", key: "web:k1" }, { source: "person", key: "web:k2" }]);
  });

  it("a piece outside the provider refuses every press, saying why", async () => {
    expect(await send(WebHost.missing.wire(options()), { name: "ada" })).toMatchObject({ ok: false, refusal: { name: "NoHost" } });
    expect(WebHost.missing.onFinished(["x"], () => undefined)()).toBeUndefined();
  });
});
