// Check 14 (M1.12): projections as plugins, part two, and the SDK contract (K5 seam 5). Acme mounts the sdk, the cli and the
// mcp beside the model, api and server; `ortho generate` writes `generated/{sdk,cli,mcp}` as the fixed renderers did, plus the
// new options; and the SDK is what every other door builds on: the caller is the client's layer, a request key is stable across
// retries, declared refusals are typed in the error channel, and what an MCP tool is follows `via`.
//
// Assumptions beyond K5 seam 5, M1-plugins (sections 1 to 3, 15, the notes on checks 12 and 13 and on M1.11's build) and
// canon `doors.mdx`, where the design is silent:
//  1. Mounts. `@orthograph/projections` also exports `sdk`, `cli` and `mcp` (X-10), and acme mounts each as
//     `blueprint/projections/<name>.ts`, `export default Blueprint.use(<name>)`, as check 12 has it for the first three. Mounted
//     as they are, `model.mounts` has six projections (check 12 is changed to allow it). A mount is what makes the output:
//     without `cli.ts`, nothing writes `generated/cli/` while the sdk and mcp still are (nothing builds on the CLI). Not judged:
//     a cli mounted without its sdk, and a project that mounts no projection (M1.11's rule: it keeps the fixed list).
//  2. "Unchanged apart from the new options" is `e2e/fixtures/m1/clients/acme-baseline.json`, taken from acme's checked-in
//     `generated/` at m1 3a99bd92 (44 files), recaptured after M1.35 (52: each thing's `types.ts` added, design/decisions/M1-clients-baseline.md). The cli (its `main.ts` too) and the mcp are byte for byte apart from the header
//     line, which may say the blueprint or the mount (`// Generated from blueprint/projections/<name>.ts. Do not edit.`, and it
//     sits below the CLI entry's shebang), and so is each thing's `sdk/src/<thing>/index.ts`. Only `sdk/src/client.ts`,
//     `sdk/src/index.ts` and each operation's file `sdk/src/<thing>/<verb>.ts` may differ (the layer, what the barrel exports,
//     the function's second parameter) and the SDK may gain files; none of those loses what it exported, and each operation
//     file still names its declaration and its doc comment. The CLI is built on the SDK and not changed: it still makes its
//     layer as `Sdk.layer(url, token)`, which is why that form stays (3).
//  3. The new options, all on the SDK: the caller on the layer, `Sdk.layer({ url, credential })` with
//     `Sdk.Credential.session(token)` (K5: `Credential.session(cookie)`; in a world, a session is the bearer token `/_world/cast`
//     gives, and no credential means anonymous); and per call, a second parameter `{ requestKey?: string }` and nothing else (a
//     credential there does not compile). The positional `Sdk.layer(baseUrl, token?)` of today keeps working beside it.
//  4. The request key travels as the `idempotency-key` header, which the Worker already honours for `idempotent: "request"`
//     (D2 #44; acme's `allowance.spend` is one). Without a key from the caller, the SDK makes one when the call starts, and a
//     second call makes another. The SDK retries a call whose answer never came (the connection was cut: `TransportError`) when
//     the operation is `idempotent: "request"`, with the key it started with, and never retries one that is not (acme's
//     `allowance.revoke`): the Worker could not keep an answer for it, and a retry could be a second write (K9: a lost answer
//     may have committed). How many times, and after how long, is not judged; the check waits.
//  5. Typed refusals are the HttpApi's own, as today, plus K5's `InvalidPayload`: a payload the schema refuses is
//     `InvalidPayload` in the error channel (the SDK encodes before it sends), and nothing is sent. A server defect, a 500, is
//     a die, never a typed failure.
//  6. A retry is simulated by a proxy bound to port 0 between the SDK and the world: it forwards the first request, waits for the
//     Worker to answer, and cuts the connection without relaying the answer (the call landed; the caller never heard). It gives
//     each request a trace id when the client sent none, so the world's journal can be read by trace. "Commits once" is the
//     world's journal read for every trace the proxy saw: exactly one `AllowanceSpent` for the allowance (a commit writes its
//     events with it, so one event is one commit), and the allowance's `spent` row is 100, not 200.
//  7. Tool exposure follows `via` and `runs`: an MCP tool exists for an operation that reaches `agent` (no `via`, or a mount's
//     `narrow` that keeps `Via.agent`) and does not run on the device. `.via`/`.notVia` on roles is M2.01, so the `allowed` half
//     of K2's rule has nothing to say in M1, and is not judged.
//  8. "The CLI and MCP journeys still pass": acme has no journey that goes `--through` a client (M2.08). The checks that go
//     through them are `layer1/05` (the CLI's exit codes and `--json`, a typed SDK call, against `ortho dev`), `layer2/07` (the
//     remote MCP door with OAuth, against the layer-2 stack), and `m1/02` and `m1/08` (MCP calls into a world); they run
//     unchanged in the full gate. This file judges the same two doors on acme with the mounts, in a world of its own: the CLI's
//     exit codes and `--json`, and an MCP call through OAuth, accepted and refused.
//  9. Nothing here needs Docker: the world is wrangler on workerd, the Collector is `Collectors.local` (as check 13), the
//     proxy, the SDK programs and the CLI are processes of this run. Ports are bound with 0.
//
// Red today on the missing surface only: no `sdk`, `cli` or `mcp` mount, no `Credential`, no key sent, no retry, no
// `InvalidPayload`, a 500 is not a die. The controls pass today and keep passing.
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { callAs } from "../layer2/mcp.ts";
import { acme, copyOf, declaration, model, mountEcho, nothingRunning, project, removeAt, run, succeeds, writeMount, type Copy } from "./support.ts";
import { baseline, carriesOptions, clientDigest, differences, exportsOf, headerless, keepsItsFace, longWorld, missingExports, proxy, runCli, runSdk, type Fate, type Proxy, type World } from "./clients.ts";

const copies: Array<{ readonly remove: () => void }> = [];
const fresh = () => { const copy = copyOf(acme); copies.push(copy); return copy.root; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const clients = ["sdk", "cli", "mcp"] as const;
const mountPath = (name: string) => `blueprint/projections/${name}.ts`;
const unmounted = () => clients.filter((name) => !existsSync(join(acme, mountPath(name))));

describe("14 the surface: what acme needs to mount its clients", () => {
  it("has sdk, cli and mcp in @orthograph/projections, acme's three mount files, and the SDK's Credential", () => {
    const missing: Array<string> = [];
    const probe = spawnSync(process.execPath, ["--input-type=module", "-e",
      `const m = await import("@orthograph/projections"); console.log(JSON.stringify(${JSON.stringify(clients)}.map((k) => [k, m[k]?.kind, typeof m[k]?.render])));`],
    { cwd: acme, encoding: "utf8" });
    const found = probe.status === 0 ? (JSON.parse(probe.stdout.trim().split("\n").at(-1) ?? "[]") as Array<[string, unknown, unknown]>) : [];
    for (const name of clients) {
      if (!found.some(([key, kind, render]) => key === name && kind === "projection" && render === "function")) missing.push(`the export \`${name}\` of @orthograph/projections, a projection with a render`);
    }
    for (const name of unmounted()) missing.push(`examples/acme/${mountPath(name)}`);
    const barrel = join(acme, "generated/sdk/src/index.ts");
    if (!existsSync(barrel) || !/\bCredential\b/.test(readFileSync(barrel, "utf8"))) missing.push("`Credential` exported by generated/sdk/src/index.ts (K5 seam 5)");
    expect(missing, `acme's clients cannot be mounted, or carry the SDK contract, until: ${missing.join("; ")}. This is a tripwire: it fails, it never skips.`).toEqual([]);
  });
});

describe("14 controls: the baseline and the instruments", () => {
  it("the baseline records acme's 52 client files (44 taken at 3a99bd92, and each thing's `types.ts`, 8), and what acme has now still matches it where it must not change", () => {
    const want = baseline();
    const paths = Object.keys(want.files);
    expect(paths.length, "sdk, cli and mcp").toBe(52);
    expect(paths.filter((p) => /^sdk\/src\/[^/]+\/types\.ts$/.test(p)), "a types file per thing").toHaveLength(8);
    expect(paths.filter((p) => carriesOptions(p) && /^sdk\/src\/[^/]+\/[^/]+\.ts$/.test(p)), "an sdk file per operation: the types files are not among them").toHaveLength(15);
    expect(Object.keys(want.files).filter((p) => p.startsWith("mcp/")), "one mcp file").toEqual(["mcp/src/index.ts"]);
    expect(want.exports.things["allowance"]).toEqual(["get", "grant", "revoke", "spend"]);
    expect(differences(want.files, clientDigest(acme)), "the cli, the mcp and each thing's sdk index, byte for byte but their first line").toEqual([]);
  });

  it("the comparison sees a changed byte, an extra file and a missing one, and allows what carries the options", () => {
    const root = fresh();
    const want = baseline().files;
    expect(headerless("#!/usr/bin/env node\n// Generated from the blueprint. Do not edit.\nx")).toBe(headerless("#!/usr/bin/env node\n// Generated from blueprint/projections/cli.ts. Do not edit.\nx"));
    expect(differences(want, clientDigest(root)), "acme as it is").toEqual([]);
    const main = join(root, "generated/cli/src/main.ts");
    const original = readFileSync(main, "utf8");
    writeFileSync(main, original.replace("// Generated from the blueprint.", "// Generated from blueprint/projections/cli.ts."));
    expect(differences(want, clientDigest(root)), "a header naming the mount, below the shebang").toEqual([]);
    writeFileSync(main, original.replace("signed in with", "signed up with"));
    writeFileSync(join(root, "generated/sdk/src/client.ts"), "// Generated from the blueprint. Do not edit.\n");
    writeFileSync(join(root, "generated/sdk/src/credential.ts"), "x");
    expect(differences(want, clientDigest(root)), "the layer may change and the sdk gain a file").toEqual(["changed cli/src/main.ts"]);
    writeFileSync(join(root, "generated/cli/extra.txt"), "x");
    removeAt(root, "generated/mcp/src/index.ts");
    removeAt(root, "generated/sdk/src/allowance/index.ts");
    expect(differences(want, clientDigest(root))).toEqual(["changed cli/src/main.ts", "extra cli/extra.txt", "missing mcp/src/index.ts", "missing sdk/src/allowance/index.ts"]);
    expect([carriesOptions("sdk/src/client.ts"), carriesOptions("sdk/src/allowance/spend.ts"), carriesOptions("sdk/src/allowance/index.ts"), carriesOptions("sdk/src/allowance/types.ts"), carriesOptions("cli/src/main.ts")]).toEqual([true, true, false, false, false]);
  });

  it("the proxy passes a request on, loses the first answer, and tells the key and the trace of each", async () => {
    const hits: Array<string | undefined> = [];
    const stub = createServer((request, response) => { hits.push(String(request.headers["idempotency-key"])); response.end("{}"); });
    await new Promise<void>((resolve) => { stub.listen(0, "127.0.0.1", resolve); });
    const px = await proxy(`http://127.0.0.1:${(stub.address() as AddressInfo).port}`, (n): Fate => (n === 1 ? "lose-the-answer" : "forward"));
    try {
      const send = () => fetch(`${px.url}/x`, { method: "POST", headers: { "idempotency-key": "k-1" }, body: "{}" });
      await expect(send()).rejects.toThrow();
      expect((await send()).status).toBe(200);
      expect(hits, "the Worker heard both, so the first call landed").toEqual(["k-1", "k-1"]);
      expect(px.seen.map((s) => [s.n, s.key, s.fate])).toEqual([[1, "k-1", "lose-the-answer"], [2, "k-1", "forward"]]);
      expect(new Set(px.seen.map((s) => s.trace)).size, "one trace each").toBe(2);
    } finally { await px.close(); await new Promise<void>((resolve) => { stub.close(() => resolve()); }); }
  });
});

// ---- one world, for every test that talks to a server ----

let copy: ReturnType<typeof copyOf>;
let handle: ReturnType<typeof longWorld>;
let world: World;
let cast: Awaited<ReturnType<World["cast"]>>;
const proxies: Array<Proxy> = [];
beforeAll(async () => {
  copy = copyOf(acme);
  succeeds(copy.root, "generate");
  handle = longWorld(copy.root);
  world = await handle.open();
  cast = await world.cast("ada", "olga", "bob");
}, 300_000);
afterEach(async () => { for (const px of proxies.splice(0)) await px.close(); });
afterAll(async () => { await handle?.close(); if (copy) { nothingRunning(copy.root); copy.remove(); } });

const through = async (fate?: (n: number, path: string) => Fate) => { const px = await proxy(world.url, fate); proxies.push(px); return px; };
const lose = (which: number): ((n: number) => Fate) => (n) => (n === which ? "lose-the-answer" : "forward");
/** An organisation of ada's with an allowance of olga's (limit 500), made through the CLI straight to the world. */
const fund = async () => {
  const as = (who: string) => ({ ACME_URL: world.url, ACME_TOKEN: cast[who]!.token });
  const organization = (await runCli(copy.root, as("ada"), "organization", "create", "--name", "Acme Demo", "--cap", "1000")).stdout;
  const allowance = (await runCli(copy.root, as("ada"), "allowance", "grant", "--organization", organization, "--member", cast["olga"]!.person, "--limit", "500")).stdout;
  expect(allowance).toMatch(/^alw_/);
  return allowance;
};
/** The `AllowanceSpent` events the world holds for the allowance in every trace the proxy saw. */
const commits = async (px: Proxy, allowance: string) => {
  const rows = (await Promise.all([...new Set(px.seen.map((s) => s.trace))].map((trace) => world.journal(trace)))).flat();
  return rows.filter((row) => row.event === "AllowanceSpent" && row.subject === allowance).length;
};
const spentOf = async (allowance: string) => (await world.record("allowance", allowance))?.["spent"];
const sdk = (name: string, body: string, px: Proxy, who: string, allowance: string, more: Record<string, string> = {}) =>
  runSdk(copy.root, name, body, { SDK_URL: px.url, TOKEN: cast[who]!.token, OLGA: cast["olga"]!.token, BOB: cast["bob"]!.token, ALW: allowance, ...more });
const spend = (options: string, amount = "100n") => `Sdk.allowance.spend({ allowance: env.ALW, amount: ${amount}, memo: "m" }${options})`;
const today = `const layer = Sdk.layer(env.SDK_URL, env.TOKEN);`;
const provided = (call: string) => `${call}.pipe(Effect.provide(layer))`;

describe("14 controls, against a world: what the SDK does today and must keep doing", () => {
  it("a call made twice with no key is two spends: two events, 200 spent", async () => {
    const allowance = await fund();
    const px = await through();
    const ran = await sdk("twice", `${today}\nconst call = () => settle(${provided(spend(""))});\nout(await call());\nout(await call());`, px, "olga", allowance);
    expect(ran.lines, ran.stderr).toEqual([{ answered: { remaining: "400" } }, { answered: { remaining: "300" } }]);
    expect(await commits(px, allowance)).toBe(2);
    expect(await spentOf(allowance)).toBe("200");
  });

  it("a declared refusal is a typed failure with its code, and a stranger is refused NotAllowed", async () => {
    const allowance = await fund();
    const px = await through();
    const ran = await sdk("refusals", `${today}\nconst bob = Sdk.layer(env.SDK_URL, env.BOB);\nout(await settle(${provided(spend("", "501n"))}));\nout(await settle(Sdk.allowance.get({ id: env.ALW as never }).pipe(Effect.provide(bob))));`, px, "olga", allowance);
    expect(ran.lines, ran.stderr).toMatchObject([{ failed: { _tag: "AllowanceExceeded", code: "AL-001", remaining: "500" } }, { failed: { _tag: "NotAllowed", code: "AR-001" } }]);
  });

  it("an operation the Worker keeps no answer for is not retried when its answer is lost: one request, one revoke", async () => {
    const allowance = await fund();
    const px = await through(lose(1));
    const ran = await sdk("revoke", `${today}\nout(await settle(${provided("Sdk.allowance.revoke({ allowance: env.ALW })")}));`, px, "ada", allowance);
    expect(ran.lines, ran.stderr).toHaveLength(1);
    expect(ran.lines[0].failed ?? ran.lines[0].died, "the caller is told it failed").toBeDefined();
    expect(px.seen.map((s) => s.n), "sent once").toEqual([1]);
    expect((await world.record("allowance", allowance))?.["state"]).toBe("revoked");
  });

  it("the CLI keeps its exit codes and --json, and the MCP door answers and refuses through OAuth", async () => {
    const allowance = await fund();
    const as = (who: string) => ({ ACME_URL: world.url, ACME_TOKEN: cast[who]!.token });
    const spent = await runCli(copy.root, as("olga"), "allowance", "spend", "--allowance", allowance, "--amount", "200", "--memo", "lunch", "--json");
    expect([spent.status, JSON.parse(spent.stdout)]).toEqual([0, { remaining: "300" }]);
    const over = await runCli(copy.root, as("olga"), "allowance", "spend", "--allowance", allowance, "--amount", "301", "--memo", "too much");
    expect([over.status, over.stderr]).toEqual([41, "[AL-001] AllowanceExceeded { remaining: 300 }"]);
    expect((await runCli(copy.root, as("bob"), "allowance", "revoke", "--allowance", allowance)).status).toBe(3);
    const read = await callAs(world.url, cast["olga"]!, "allowance.get", { id: allowance });
    expect(read.isError, read.text).toBe(false);
    expect(JSON.parse(read.text.split("\n").find((l) => l.startsWith("{")) ?? "{}")).toMatchObject({ spent: "200", state: "active" });
    const refused = await callAs(world.url, cast["bob"]!, "allowance.get", { id: allowance });
    expect([refused.isError, refused.text.includes("NotAllowed")]).toEqual([true, true]);
  });
});

describe("14 M1.12: the caller is the client's layer", () => {
  it("is set once on the layer: two layers in one program are two people, and a layer with no credential is anonymous", async () => {
    const allowance = await fund();
    const px = await through();
    const layers = `const as = (token?: string) => Sdk.layer({ url: env.SDK_URL, ...(token ? { credential: Sdk.Credential.session(token) } : {}) });`;
    const get = (token?: string) => `settle(Sdk.allowance.get({ id: env.ALW as never }).pipe(Effect.provide(as(${token}))))`;
    const ran = await sdk("callers", `${layers}\nout(await settle(${spend(", { requestKey: env.KEY }")}.pipe(Effect.provide(as(env.OLGA)))));\nout(await ${get("env.BOB")});\nout(await ${get()});\nout(await ${get("env.OLGA")});`, px, "olga", allowance, { KEY: "key-callers" });
    expect(ran.lines, ran.stderr).toMatchObject([{ answered: { remaining: "400" } }, { failed: { _tag: "NotAllowed" } }, { failed: { _tag: "NotAllowed" } }, { answered: { spent: "100", state: "active" } }]);
  });

  it("is never a call's: a credential in a call's options does not type-check, and the key, the refusals and the old shapes do", () => {
    const root = fresh();
    succeeds(root, "generate");
    const dir = join(root, ".ortho/types-14");
    mkdirSync(dir, { recursive: true });
    const source = (masked: boolean) => [
      `import { Effect } from "effect";`,
      `import * as Sdk from "../../generated/sdk/src/index.ts";`,
      "declare const token: string;",
      "declare const payload: Parameters<typeof Sdk.allowance.spend>[0];",
      "export const layer = Sdk.layer({ url: \"http://127.0.0.1:1\", credential: Sdk.Credential.session(token) });",
      "export const anonymous = Sdk.layer({ url: \"http://127.0.0.1:1\" });",
      "export const spent = Sdk.allowance.spend(payload, { requestKey: \"k\" });",
      "export const handled = spent.pipe(",
      "  Effect.catchTag(\"AllowanceExceeded\", (e) => Effect.succeed(e.code)),",
      "  Effect.catchTag(\"AllowanceNotActive\", (e) => Effect.succeed(e.state)),",
      "  Effect.catchTag(\"NotAllowed\", (e) => Effect.succeed(e.code)),",
      "  Effect.catchTag(\"InvalidPayload\", () => Effect.succeed(\"bad\")),",
      ");",
      "export const before = Sdk.allowance.spend(payload).pipe(Effect.provide(Sdk.layer(\"http://127.0.0.1:1\", token)));",
      ...(masked ? ["// @ts-expect-error the caller is the layer's, never the call's"] : ["// the same line, unmasked"]),
      "export const perCall = Sdk.allowance.spend(payload, { credential: Sdk.Credential.session(token) });",
      "",
    ].join("\n");
    const tsc = (text: string) => {
      writeFileSync(join(dir, "program.ts"), text);
      writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ extends: join(root, "tsconfig.json"), compilerOptions: { noEmit: true, noUnusedLocals: false }, include: ["./program.ts"] }));
      const result = spawnSync(join(root, "node_modules/.bin/tsc"), ["-p", join(dir, "tsconfig.json"), "--pretty", "false"], { cwd: root, encoding: "utf8", timeout: 180_000 });
      const out = `${result.stdout}${result.stderr}`;
      return { status: result.status, out, lines: [...out.matchAll(/program\.ts\((\d+),\d+\): error (TS\d+)/g)].map((m) => Number(m[1])) };
    };
    const masked = tsc(source(true));
    expect(masked.out, "with the directive in place everything else compiles").toBe("");
    const unmasked = tsc(source(false));
    const line = source(false).split("\n").findIndex((l) => l.startsWith("export const perCall")) + 1;
    expect(unmasked.lines, unmasked.out).toEqual([line]);
  });
});

describe("14 M1.12: a retried SDK call commits once", () => {
  it("sends the key the caller gave, as idempotency-key, and makes a different one for each call that gave none", async () => {
    const allowance = await fund();
    const px = await through();
    const ran = await sdk("keys", `${today}\nout(await settle(${provided(spend(", { requestKey: env.KEY }"))}));\nout(await settle(${provided(spend(""))}));\nout(await settle(${provided(spend(""))}));`, px, "olga", allowance, { KEY: "key-given-1" });
    expect(ran.lines, ran.stderr).toHaveLength(3);
    const keys = px.seen.map((s) => s.key);
    expect(keys[0]).toBe("key-given-1");
    expect(keys.slice(1).every((key) => typeof key === "string" && key.length > 0), `the SDK makes a key when the call starts: ${JSON.stringify(keys)}`).toBe(true);
    expect(new Set(keys).size, "three calls, three keys").toBe(3);
  });

  it("retries a call whose answer was lost with the caller's key, and the call commits once", async () => {
    const allowance = await fund();
    const px = await through(lose(1));
    const ran = await sdk("lost-given", `${today}\nout(await settle(${provided(spend(", { requestKey: env.KEY }"))}));`, px, "olga", allowance, { KEY: "key-given-2" });
    expect(ran.lines, ran.stderr).toEqual([{ answered: { remaining: "400" } }]);
    expect(px.seen.length, "the SDK sent it again").toBeGreaterThanOrEqual(2);
    expect(px.seen.map((s) => s.key), "with one key").toEqual(px.seen.map(() => "key-given-2"));
    expect(await commits(px, allowance), "one event, so one commit").toBe(1);
    expect(await spentOf(allowance), "100, not 200").toBe("100");
  });

  it("retries with the key it made when the caller gave none, and the call commits once", async () => {
    const allowance = await fund();
    const px = await through(lose(1));
    const ran = await sdk("lost-made", `${today}\nout(await settle(${provided(spend(""))}));`, px, "olga", allowance);
    expect(ran.lines, ran.stderr).toEqual([{ answered: { remaining: "400" } }]);
    const keys = px.seen.map((s) => s.key);
    expect(keys.length, "the SDK sent it again").toBeGreaterThanOrEqual(2);
    expect(keys[0], "a key from the start").toMatch(/\S/);
    expect(new Set(keys).size, `one key across the retries: ${JSON.stringify(keys)}`).toBe(1);
    expect(await commits(px, allowance)).toBe(1);
    expect(await spentOf(allowance)).toBe("100");
  });

  it("answers a caller's own retry with the first answer when the key is the same, and spends again when it is not", async () => {
    const allowance = await fund();
    const px = await through();
    const call = (key: string) => `out(await settle(${provided(spend(`, { requestKey: ${JSON.stringify(key)} }`))}));`;
    const ran = await sdk("retry", `${today}\n${call("k-same")}\n${call("k-same")}\n${call("k-other")}`, px, "olga", allowance);
    expect(ran.lines, ran.stderr).toEqual([{ answered: { remaining: "400" } }, { answered: { remaining: "400" } }, { answered: { remaining: "300" } }]);
    expect(px.seen.length, "the second call did reach the Worker").toBe(3);
    expect(await commits(px, allowance), "k-same once, k-other once").toBe(2);
    expect(await spentOf(allowance)).toBe("200");
  });

  it("is retried by the CLI too, which is built on the SDK: one spend, exit 0, the answer", async () => {
    const allowance = await fund();
    const px = await through(lose(1));
    const spent = await runCli(copy.root, { ACME_URL: px.url, ACME_TOKEN: cast["olga"]!.token }, "allowance", "spend", "--allowance", allowance, "--amount", "100", "--memo", "cli", "--json");
    expect([spent.status, spent.stdout, spent.stderr], "the CLI heard the second answer").toEqual([0, '{"remaining":"400"}', ""]);
    expect(await commits(px, allowance)).toBe(1);
    expect(await spentOf(allowance)).toBe("100");
  });
});

describe("14 M1.12: refusals and defects in the error channel", () => {
  it("a payload the schema refuses is InvalidPayload, and nothing is sent", async () => {
    const allowance = await fund();
    const px = await through();
    const ran = await sdk("invalid", `${today}\nout(await settle(${provided(spend(", { requestKey: env.KEY }", '"many" as never'))}));`, px, "olga", allowance, { KEY: "key-invalid" });
    expect(ran.lines, ran.stderr).toMatchObject([{ failed: { _tag: "InvalidPayload" } }]);
    expect(px.seen, "the call never left the client").toEqual([]);
  });

  it("a server defect is a die, not a typed failure", async () => {
    const allowance = await fund();
    const px = await through(() => "answer-500");
    const ran = await sdk("defect", `${today}\nout(await settle(${provided(spend(", { requestKey: env.KEY }"))}));`, px, "olga", allowance, { KEY: "key-defect" });
    expect(ran.lines, ran.stderr).toMatchObject([{ died: true }]);
    expect(ran.lines[0].failed).toBeUndefined();
  });
});

describe("14 M1.12: acme mounts its clients, and what they make is unchanged apart from the new options", () => {
  it("mounts each from @orthograph/projections in its own file", () => {
    for (const name of clients) {
      expect(existsSync(join(acme, mountPath(name))), `examples/acme/${mountPath(name)} is missing`).toBe(true);
      const text = readFileSync(join(acme, mountPath(name)), "utf8");
      expect(text, mountPath(name)).toMatch(new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from "@orthograph/projections"`));
      expect(text, mountPath(name)).toMatch(new RegExp(`export default Blueprint\\.use\\(${name}\\b`));
    }
  });

  it("control: the export check fails when a real export is dropped, and passes on the whole baseline", () => {
    const { exports: want } = baseline();
    const whole = { top: [...want.top, "Credential"], things: want.things };
    expect(missingExports(want, whole, ["Credential"]), "the baseline itself").toEqual([]);
    expect(missingExports(want, { ...whole, top: whole.top.filter((n) => n !== "Credential") }, ["Credential"])).toEqual(["Credential"]);
    expect(missingExports(want, { ...whole, top: whole.top.filter((n) => n !== want.top[0]) }, ["Credential"])).toEqual([want.top[0]]);
    const thing = Object.keys(want.things).find((t) => (want.things[t] ?? []).length > 0)!;
    const dropped = want.things[thing]![0]!;
    expect(missingExports(want, { ...whole, things: { ...want.things, [thing]: want.things[thing]!.slice(1) } }, ["Credential"]), "a thing's own export").toEqual([`${thing}.${dropped}`]);
  });

  it("generates the clients as the fixed renderers did apart from the options, exports all it did, and check passes", () => {
    const root = fresh();
    for (const name of clients) expect(existsSync(join(root, mountPath(name))), `${mountPath(name)} is not in the project`).toBe(true);
    for (const name of clients) removeAt(root, `generated/${name}`);
    succeeds(root, "generate");
    const want = baseline();
    const got = clientDigest(root);
    expect(differences(want.files, got), "the cli, the mcp and each thing's sdk index, byte for byte but their first line").toEqual([]);
    const faces = Object.keys(want.files).filter((p) => carriesOptions(p) && /^sdk\/src\/[^/]+\/[^/]+\.ts$/.test(p));
    expect(faces.length, "an sdk file per operation").toBe(15);
    expect(faces.filter((path) => !keepsItsFace(root, path)), "each keeps its doc comment and its declaration").toEqual([]);
    expect(missingExports(want.exports, exportsOf(root), ["Credential"]), "everything the SDK exported, and the Credential").toEqual([]);
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(0);
  });

  it("records the three mounts in the model as projections, beside the first three", () => {
    const root = fresh();
    succeeds(root, "generate");
    const mounts = model(root).mounts ?? {};
    for (const name of clients) {
      expect(mounts[name], `mounts.${name}`).toMatchObject({ kind: "projection", file: mountPath(name), package: "@orthograph/projections" });
      expect(mounts[name]?.hash, `mounts.${name}.hash`).toEqual(expect.any(String));
    }
    // M1.22 adds the `actions` projection beside them (design/decisions/WEB-actions-projection.md): it may be mounted or not, nothing else may.
    expect(Object.keys(mounts).filter((name) => mounts[name]?.kind === "projection" && name !== "actions").sort()).toEqual(["api", "cli", "mcp", "model", "sdk", "server"]);
  });

  it("writes no generated/cli when its mount is removed, and still writes the sdk and the mcp", () => {
    const root = fresh();
    for (const name of clients) expect(existsSync(join(root, mountPath(name))), `${mountPath(name)} is not in the project`).toBe(true);
    succeeds(root, "generate");
    expect(existsSync(join(root, "generated/cli/src/main.ts")), "generated with the cli mounted").toBe(true);
    removeAt(root, mountPath("cli"));
    for (const name of clients) removeAt(root, `generated/${name}`);
    succeeds(root, "generate");
    expect(existsSync(join(root, "generated/cli")), "nothing mounts the cli, so nothing writes it").toBe(false);
    expect(existsSync(join(root, "generated/sdk/src/index.ts")) && existsSync(join(root, "generated/mcp/src/index.ts"))).toBe(true);
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(0);
  });
});

describe("14 M1.12: which operations are MCP tools follows via, and what runs on the device is none", () => {
  const tools = (root: string) => [...readFileSync(join(root, "generated/mcp/src/index.ts"), "utf8").matchAll(/^ {2}"([^"]+)": \{ description/gm)].map((m) => m[1]!).sort();
  const reachesAnAgent = (operation: { readonly via?: ReadonlyArray<string>; readonly runs?: unknown }) => (operation.via === undefined || operation.via.includes("agent")) && operation.runs !== "client";
  const withEcho = (via: string) => {
    const made: Copy = project("echo", "device");
    copies.push(made);
    for (const name of clients) expect(existsSync(join(made.root, mountPath(name))), `${mountPath(name)} is not in the project`).toBe(true);
    writeMount(made.root, "feature", "device", { pkg: "@fixture/device" });
    mountEcho(made.root, { via: true, imports: [declaration("repeat", "echo", "repeat")], verbs: [`p.narrow(repeat, { via: ${via} })`] });
    succeeds(made.root, "generate");
    return made.root;
  };

  it("is a tool for what an agent can reach, not for what a mount narrowed it out of, and never for a client operation", () => {
    const root = withEcho("[Via.session, Via.key]");
    const operations = model(root).operations;
    expect(tools(root)).toEqual(Object.entries(operations).filter(([, operation]) => reachesAnAgent(operation)).map(([name]) => name).sort());
    expect(tools(root)).toEqual(expect.arrayContaining(["allowance.spend", "echo.shout"]));
    expect(tools(root), "narrowed without agent").not.toContain("echo.repeat");
    expect(tools(root), "runs on the device").not.toContain("receipt.stamp");
    expect(existsSync(join(root, "generated/sdk/src/receipt/stamp.ts")), "the SDK has the client operation").toBe(true);
  });

  it("keeps the tool of an operation narrowed to ways in that include the agent", () => {
    const root = withEcho("[Via.key, Via.agent]");
    expect(tools(root)).toEqual(expect.arrayContaining(["echo.repeat", "echo.shout"]));
  });
});
