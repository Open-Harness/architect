// Check 24 (HAN-10, `design/ledger.md`): a request key used again with another payload is a typed built-in refusal.
//
// PR #95 (M1.35) made a reused request key with a different payload refuse instead of answering the first call's answer
// (`IdempotencyConflict`, `language-effect/src/modules/handler/service.ts`). But the refusal is only a class in the runtime:
// it is in no endpoint's error list, no row of the generated refusals table (`generated/api/src/errors.ts`), no SDK error and
// no model entry, so over HTTP, the SDK and the CLI the caller meets a defect (a 500, a die, exit 1), and the span has no
// `refusal.code`. A built-in refusal is one the runtime makes for every call (`NotAllowed`, `InvalidPayload`, a missing
// `<Thing>NotFound`); this makes the fourth one a refusal the same way: a row in the table, carried to every door.
//
// What the check chooses (the design is silent on this refusal's row; the choices follow the others'):
//  - code `AR-002`. A runtime refusal belongs to no thing and takes the `AR` prefix (`compiler/.../model/internal/codes.ts`,
//    `RUNTIME_CODES = { NotAllowed: "AR-001" }`), numbered in the order the runtime gained them: this is the second.
//  - exit `120`. The CLI exits with the refusal's own exit, and the runtime keeps 0 to 4 (success, a defect, `InvalidPayload`,
//    `NotAllowed`, `<Thing>NotFound`) and 120 to 125; a declared exit is 5 to 119 (`design/decisions/G3-runtime-exits.md`, the
//    lead's call: 5 is acme's `AllowanceExceeded` and the canon quotes it, so 5 was not free). `IdempotencyConflict` is 120.
//    The compiler refuses a declared 120 as IdempotencyConflict's, 121 to 125 as the runtime's, and 126 as outside 5 to 119.
//  - status `409`. The refusal says the request clashes with what the server already holds for that key, the same
//    "conflicts with current state" as the machine's `<Thing>NotFrom` (409), and not the caller's payload being wrong (422) or
//    the caller not being allowed (403).
//  - fields none, as `NotAllowed` has none: the caller knows its own key, and what the runtime holds is the key under the
//    operation and the caller (`allowance.spend|<person>|<key>`), which is never shown. HTTP body `{ _tag, code }`, the
//    CLI line `[AR-002] IdempotencyConflict`.
//  - it applies to the operations that keep an answer by request key (`idempotent: "request"`), as `NotAllowed` applies to
//    the operations a role guards: `allowance.spend` lists it in the model's `refusals`, `allowance.revoke` (not idempotent) does not.
//  - MCP: an MCP tool takes no request key (`mcp/internal/tool.ts` calls `served.run` without one), so no MCP call can reach
//    this refusal today and none is made here. What an MCP refusal reads is the generated table, so the table's row is what is
//    judged (`refusals.table`, M1.47), and an MCP call that carries a key later gets the structured form from it.
//
// The calls (acme, `allowance`): ada founds an organisation and grants olga an allowance of 500; olga spends 100 with the key
// `han10-key` (answered, 400 remaining) and then spends 200 with the same key. The control sends the first payload again (the
// same key, the same payload): the first answer comes back, nothing is committed twice. The doors: HTTP direct; the SDK and
// the CLI (the CLI has no key flag, and the SDK's per-call `{ requestKey }` is M1.12's, not on every base) through a proxy that
// gives every request the one key, as a client that wrongly reuses a key does.
//
// Red today for exactly HAN-10's reason: the second call is a defect (a 500; the SDK dies, the CLI exits 1 and prints no code),
// the table, the model and the span know nothing of the refusal. The controls pass today: the first call is answered, a replay
// returns its answer, a conflict commits nothing and the counter counts it as refused.
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Collectors, Worlds, type Span } from "@orthograph/prove";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freePort, runCli, runSdk } from "./clients.ts";
import { acme, copyOf, model, nothingRunning, run, succeeds, textAt } from "./support.ts";

const CODE = "AR-002";
const EXIT = 120;
const STATUS = 409;
const KEY = "han10-key";

// ---- one world, its Collector's files, and the calls ----

interface Point { readonly name: string; readonly labels: Record<string, string>; readonly value: number }
interface Called { readonly trace: string; readonly status: number; readonly body: Record<string, unknown>; readonly text: string }
interface Seen {
  readonly url: string;
  readonly cast: (...names: ReadonlyArray<string>) => Promise<Record<string, { readonly person: string; readonly token: string }>>;
  readonly call: (route: string, token: string | undefined, body: object, key?: string) => Promise<Called>;
  readonly spans: (trace: string) => Promise<ReadonlyArray<Span>>;
  readonly metrics: () => ReadonlyArray<Point>;
  readonly journal: (trace: string) => Promise<ReadonlyArray<{ readonly event?: string; readonly subject?: string }>>;
  readonly record: (table: string, id: string) => Promise<Record<string, unknown> | null>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
const until = async <A>(read: () => Promise<A> | A, done: (a: A) => boolean, ms = 20_000) => {
  const end = Date.now() + ms;
  let last = await read();
  while (!done(last) && Date.now() < end) { await sleep(60); last = await read(); }
  return last;
};

const pointsIn = (dir: string): ReadonlyArray<Point> => {
  const file = join(dir, "metrics.jsonl");
  if (!existsSync(file)) return [];
  type Raw = { attributes: ReadonlyArray<{ key: string; value: { stringValue?: string } }>; asInt?: string; asDouble?: number; sum?: number };
  type Metric = { name: string; sum?: { dataPoints: ReadonlyArray<Raw> }; histogram?: { dataPoints: ReadonlyArray<Raw> } };
  return readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((line) =>
    (JSON.parse(line) as { resourceMetrics: Array<{ scopeMetrics: Array<{ metrics: Array<Metric> }> }> }).resourceMetrics
      .flatMap((r) => r.scopeMetrics.flatMap((s) => s.metrics))
      .flatMap((metric) => (metric.sum?.dataPoints ?? metric.histogram?.dataPoints ?? []).map((point) => ({
        name: metric.name,
        labels: Object.fromEntries(point.attributes.map(({ key, value }) => [key, value.stringValue ?? ""])),
        value: Number(point.asInt ?? point.asDouble ?? point.sum ?? 0),
      }))));
};

let copy: ReturnType<typeof copyOf>;
let seen: Seen;
const scope = Effect.runSync(Scope.make());
beforeAll(async () => {
  copy = copyOf(acme);
  succeeds(copy.root, "generate");
  seen = await Effect.runPromise(Effect.gen(function* () {
    const dir = mkdtempSync(join(tmpdir(), "ortho-m1-han10-"));
    yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));
    const collector = yield* Collectors.local(dir, []);
    const world = yield* Worlds.start({ root: copy.root, port: yield* Effect.promise(freePort), name: "m1-han10", otlp: collector.url });
    const json = (path: string, init?: RequestInit) => fetch(`${world.url}${path}`, init).then((r) => r.json() as Promise<any>);
    return {
      url: world.url,
      cast: (...names) => json("/_world/cast", { method: "POST", body: JSON.stringify({ names }) }),
      call: async (route, token, body, key) => {
        const trace = randomBytes(16).toString("hex");
        const response = await fetch(`${world.url}/${route}`, {
          method: "POST",
          headers: {
            "content-type": "application/json", traceparent: `00-${trace}-${randomBytes(8).toString("hex")}-01`,
            ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { "idempotency-key": key } : {}),
          },
          body: JSON.stringify(body),
        });
        const text = await response.text();
        return { trace, status: response.status, text, body: (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; } })() };
      },
      spans: (trace) => Effect.runPromise(collector.find(trace)).then((found) => found?.spans ?? []),
      metrics: () => pointsIn(dir),
      journal: (trace) => json(`/_world/facts/journal?trace=${trace}`),
      record: (table, id) => json(`/_world/facts/record?table=${table}&id=${encodeURIComponent(id)}`),
    } satisfies Seen;
  }).pipe(Scope.provide(scope)));
}, 300_000);
afterAll(async () => { await Effect.runPromise(Scope.close(scope, Exit.void)); if (copy) { nothingRunning(copy.root); copy.remove(); } });

/** An organisation of ada's with a 500 allowance of olga's. */
const fund = async () => {
  const people = await seen.cast("ada", "olga");
  const ada = people["ada"]!;
  const olga = people["olga"]!;
  const { body: { organization } } = await seen.call("organization/create", ada.token, { name: "HAN-10", cap: "1000" });
  const { body: { allowance } } = await seen.call("allowance/grant", ada.token, { organization, member: olga.person, limit: "500" });
  return { allowance: allowance as string, ada, olga };
};
const spend = (who: { token: string }, allowance: string, amount: string, key: string) => seen.call("allowance/spend", who.token, { allowance, amount, memo: "han-10" }, key);
const events = async (allowance: string, ...traces: ReadonlyArray<string>) =>
  (await Promise.all(traces.map((t) => seen.journal(t)))).flat().filter((row) => row.event === "AllowanceSpent" && row.subject === allowance).length;
const refusedOnce = (labels: Record<string, string>) => seen.metrics().filter((p) => p.name === "ortho.calls" && p.value > 0 && Object.entries(labels).every(([k, v]) => p.labels[k] === v));

/** The first call (100, answered), then the same key with 200: what each door is shown for the second. */
const reused = async (key: string) => {
  const { allowance, olga } = await fund();
  const first = await spend(olga, allowance, "100", key);
  const second = await spend(olga, allowance, "200", key);
  return { allowance, olga, first, second };
};

// ---- the controls: true today ----

describe("24 controls: what a reused key does today", () => {
  it("answers the first call, and the same key with the same payload is answered with the first answer, committing once", async () => {
    const { allowance, olga } = await fund();
    const first = await spend(olga, allowance, "100", "han10-replay");
    const again = await spend(olga, allowance, "100", "han10-replay");
    expect([first.status, first.body], first.text).toEqual([200, { remaining: "400" }]);
    expect([again.status, again.body], again.text).toEqual([200, { remaining: "400" }]);
    expect(await events(allowance, first.trace, again.trace), "one commit").toBe(1);
    expect((await seen.record("allowance", allowance))?.["spent"]).toBe("100");
    expect((await spend(olga, allowance, "100", "han10-another")).body, "another key is another spend").toEqual({ remaining: "300" });
  });

  it("commits nothing for the other payload, and still answers the first payload with the first answer afterwards", async () => {
    const { allowance, olga, first, second } = await reused("han10-nothing");
    expect(first.status).toBe(200);
    expect(second.status, "refused, never answered as a success").not.toBe(200);
    expect(await events(allowance, first.trace, second.trace), "the first call's one event, none for the second").toBe(1);
    expect((await seen.record("allowance", allowance))?.["spent"], "200 was not spent").toBe("100");
    const third = await spend(olga, allowance, "100", "han10-nothing");
    expect([third.status, third.body], "the first answer is still the key's").toEqual([200, { remaining: "400" }]);
  });
});

// ---- the refusal is a row of the table, as the others are ----

describe("24 HAN-10: IdempotencyConflict is a built-in refusal of the model and of the generated table", () => {
  it("has a code in the model, and an idempotent operation (not another) lists it", () => {
    const m = model(copy.root) as unknown as { refusals: Record<string, string>; operations: Record<string, { refusals: ReadonlyArray<string> }> };
    expect(m.refusals, "beside NotAllowed's AR-001").toMatchObject({ NotAllowed: "AR-001", IdempotencyConflict: CODE });
    for (const operation of ["allowance.spend", "allowance.grant", "organization.create"]) expect(m.operations[operation]!.refusals, `${operation} is idempotent: "request"`).toContain("IdempotencyConflict");
    expect(m.operations["allowance.revoke"]!.refusals, "revoke keeps no answer by key").not.toContain("IdempotencyConflict");
  });

  it("is one row of generated errors.ts beside NotAllowed's, which the CLI, HTTP and MCP read, and is a wire class every idempotent endpoint lists", () => {
    const errors = textAt(copy.root, "generated/api/src/errors.ts");
    expect(errors).toContain(`  NotAllowed: { code: "AR-001", exit: 3, status: 403 },\n`);
    expect(errors).toContain(`  IdempotencyConflict: { code: "${CODE}", exit: ${EXIT}, status: ${STATUS} },\n`);
    expect(errors).toMatch(/export class IdempotencyConflict extends Schema\.TaggedError<IdempotencyConflict>\(\)\("IdempotencyConflict"/);
    expect(errors, "in the wire classes by name").toMatch(/export const wire = \{[^}]*\bIdempotencyConflict\b/);
    expect(textAt(copy.root, "generated/api/src/allowance/spend.ts"), "the endpoint's error list").toMatch(/error: \[[^\]]*\bIdempotencyConflict\b/);
    expect(textAt(copy.root, "generated/api/src/allowance/revoke.ts"), "revoke's does not").not.toMatch(/IdempotencyConflict/);
  });

  it.each([
    [120, /AllowanceExceeded's exit 120 is IdempotencyConflict's; pick another/],
    [122, /AllowanceExceeded's exit 122 is the runtime's; pick another/],
    [126, /AllowanceExceeded's exit 126 is outside 5 to 119/],
  ])("reserves the runtime's exits: a declared exit of %i is refused, naming why", (exit, message) => {
    const root = copyOf(acme);
    try {
      const file = join(root.root, "blueprint/things/allowance/errors.ts");
      writeFileSync(file, readFileSync(file, "utf8").replace("{ remaining: Amount }, { exit: 41 }", `{ remaining: Amount }, { exit: ${exit} }`));
      const out = run(root.root, "model");
      expect(out.status, out.out).not.toBe(0);
      expect(out.out).toMatch(message);
    } finally { root.remove(); }
  });

  it("control: 5 and 119, the ends of what a blueprint may declare, still compile", () => {
    for (const exit of [5, 119]) {
      const root = copyOf(acme);
      try {
        const file = join(root.root, "blueprint/things/allowance/errors.ts");
        writeFileSync(file, readFileSync(file, "utf8").replace("{ remaining: Amount }, { exit: 41 }", `{ remaining: Amount }, { exit: ${exit} }`));
        expect(run(root.root, "model").status, `exit ${exit}`).toBe(0);
      } finally { root.remove(); }
    }
  });
});

// ---- each door a person meets ----

describe("24 HAN-10: over HTTP", () => {
  it(`answers ${STATUS} with the refusal's tag and code, no key and no detail, and not a defect`, async () => {
    const { first, second } = await reused("han10-http");
    expect(first.status).toBe(200);
    expect([second.status, second.body], second.text).toEqual([STATUS, { _tag: "IdempotencyConflict", code: CODE }]);
    expect(second.text, "the held key, namespaced by operation and caller, is never shown").not.toMatch(/allowance\.spend\||han10-http/);
  });
});

/** A server on port 0 that passes every request to the world with its `idempotency-key` replaced: one key for every call. */
const withOneKey = async (target: string, key: string) => {
  const server = createServer((request: IncomingMessage, response) => {
    const chunks: Array<Buffer> = [];
    request.on("data", (c: Buffer) => chunks.push(c));
    request.on("end", () => {
      const headers = Object.fromEntries(Object.entries(request.headers).filter(([n]) => !["host", "connection", "content-length"].includes(n)).map(([n, v]) => [n, String(v)]));
      headers["idempotency-key"] = key;
      void fetch(`${target}${request.url ?? "/"}`, { method: request.method ?? "GET", headers, ...(chunks.length === 0 || request.method === "GET" ? {} : { body: new Uint8Array(Buffer.concat(chunks)) }) })
        .then(async (answer) => { const body = Buffer.from(await answer.arrayBuffer()); response.writeHead(answer.status, { "content-type": answer.headers.get("content-type") ?? "application/json", connection: "close" }); response.end(body); })
        .catch(() => { request.socket.destroy(); });
    });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }) };
};

describe("24 HAN-10: through the SDK", () => {
  // The SDK's per-call `{ requestKey }` is M1.12's and not on every base, so the key is fixed by a proxy, as for the CLI.
  const program = [
    "const layer = Sdk.layer(env.SDK_URL, env.TOKEN);",
    "const spend = (amount: bigint) => Sdk.allowance.spend({ allowance: env.ALW, amount, memo: \"han-10\" }).pipe(Effect.provide(layer));",
    "out(await settle(spend(100n)));",
    "out(await settle(spend(200n)));",
    "out(await settle(spend(100n)));",
  ].join("\n");

  it("is a typed failure in the error channel with its tag and code, never a die; the first payload still gets its answer", async () => {
    const { allowance, olga } = await fund();
    const one = await withOneKey(seen.url, "han10-sdk");
    try {
      const ran = await runSdk(copy.root, "han10-sdk", program, { SDK_URL: one.url, TOKEN: olga.token, ALW: allowance });
      expect(ran.lines, ran.stderr).toMatchObject([{ answered: { remaining: "400" } }, { failed: { _tag: "IdempotencyConflict", code: CODE } }, { answered: { remaining: "400" } }]);
      expect(ran.lines[1].died, "a typed refusal is not a defect").toBeUndefined();
    } finally { await one.close(); }
  });

  it("is catchable by its tag, as NotAllowed is: the program type-checks", () => {
    succeeds(copy.root, "generate");
    const dir = join(copy.root, ".ortho/types-24");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "program.ts"), [
      `import { Effect } from "effect";`,
      `import * as Sdk from "../../generated/sdk/src/index.ts";`,
      "declare const payload: Parameters<typeof Sdk.allowance.spend>[0];",
      "export const handled = Sdk.allowance.spend(payload).pipe(",
      "  Effect.catchTag(\"IdempotencyConflict\", (e) => Effect.succeed(e.code)),",
      "  Effect.catchTag(\"NotAllowed\", (e) => Effect.succeed(e.code)),",
      ");",
      "",
    ].join("\n"));
    writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ extends: join(copy.root, "tsconfig.json"), compilerOptions: { noEmit: true, noUnusedLocals: false }, include: ["./program.ts"] }));
    const result = spawnSync(join(copy.root, "node_modules/.bin/tsc"), ["-p", join(dir, "tsconfig.json"), "--pretty", "false"], { cwd: copy.root, encoding: "utf8", timeout: 180_000 });
    expect(`${result.stdout}${result.stderr}`, "an error the SDK does not list cannot be caught by its tag").toBe("");
  });
});

describe("24 HAN-10: through the CLI", () => {
  it(`prints [${CODE}] IdempotencyConflict and exits ${EXIT}, where a defect exits 1 with no code`, async () => {
    const { allowance, olga } = await fund();
    const one = await withOneKey(seen.url, "han10-cli");
    try {
      const env = { ACME_URL: one.url, ACME_TOKEN: olga.token };
      const spent = (amount: string) => runCli(copy.root, env, "allowance", "spend", "--allowance", allowance, "--amount", amount, "--memo", "han-10");
      const first = await spent("100");
      const second = await spent("200");
      expect([first.status, first.stdout, first.stderr], "the first call is answered").toEqual([0, "400", ""]);
      expect([second.status, second.stderr], "the same key with another payload").toEqual([EXIT, `[${CODE}] IdempotencyConflict`]);
      expect((await spent("100")).stdout, "the first payload is still the key's").toBe("400");
    } finally { await one.close(); }
  });
});

describe("24 HAN-10: in telemetry", () => {
  it("writes refusal and refusal.code on the operation span, no defect, and no commit span", async () => {
    const { second } = await reused("han10-span");
    const spans = await until(() => seen.spans(second.trace), (all) => all.some((s) => s.name === "allowance.spend"));
    const operation = spans.find((s) => s.name === "allowance.spend");
    expect(operation?.attrs, "the operation span of the refused call").toMatchObject({ refusal: "IdempotencyConflict", "refusal.code": CODE });
    expect(operation?.attrs["defect"], "a refusal is not a defect").toBeUndefined();
    expect(spans.find((s) => s.name === "allowance.spend.commit"), "nothing was committed").toBeUndefined();
  });

  it("counts it in ortho.calls as a refusal named IdempotencyConflict, not as a defect (the handler's own count, true today)", async () => {
    await reused("han10-count");
    const counted = await until(() => refusedOnce({ operation: "allowance.spend", refusal: "IdempotencyConflict" }), (all) => all.length > 0);
    expect(counted.map((p) => [p.labels["outcome"], p.labels["refusal"]]), "refused, named").toEqual(expect.arrayContaining([["refused", "IdempotencyConflict"]]));
  });
});
