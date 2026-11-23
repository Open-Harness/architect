// Check 16 (M1.35): one visibility rule (K12 section 1, ledger OPS-01). This is also Gate M1's new item (8): "no secret field
// leaves through any output, for any audience" (milestones.md, the gate list). A `visibility` module in `language-effect` holds
// one `Audience` (`principal` with the roles held, `agent`, `telemetry`, `public`, `owner`) and `sees`, `redact` and `schema`,
// failing closed; every output below calls it. The check renders every output for every audience over a fixture thing whose
// answer and refusal carry a public, a private and a secret field, and judges three rules in each:
//   R1  no secret field leaves through any output;
//   R2  a private field reaches only a principal who holds its role;
//   R3  a field the declaration doesn't name never leaves (the handler returns one in the answer and one in the refusal).
//
// The fixture is `e2e/fixtures/m1/visibility`, laid over acme as check 13 lays its own: a `locker` thing with `label` (public),
// `note` (private to the organisation's `owner`) and `code` (secret); `locker.open` answers `{ label, note, code }` or refuses
// `LockerSealed { hint, memo, pin }` (public, private to owner, secret) and is open to anyone, so the caller's role decides what
// they see; `locker.get` reads the same three; `locker.install` is the owner's. The handler logs what it holds, as a careless
// handler would. Values are planted per run (`src/sentinels.ts` is written before `ortho generate`), so a value found in any
// captured byte went out through some output.
//
// Every output on m1 today, each named below and driven for real (workerd world, the generated SDK and CLI as programs of the
// project's own, MCP through OAuth, `Collectors.local` with nothing stripped; no Docker; every port from the OS):
//   answers and refusals to a caller:  http (the endpoint's body), sdk (the decoded answer and the typed failure), cli (the text),
//                                      cli-json (`--json`; a refusal is still stderr and an exit code), mcp (a tool's result and error)
//   what the runtime says of a call:   spans (`traces.jsonl`: operation, step and commit spans, handler/internal/attributes.ts),
//                                      logs (`logs.jsonl`: the handler's own log line and the one that decided a refusal, decided.ts),
//                                      metrics (`metrics.jsonl`: ortho.calls), the journal (the world's facts door, by trace)
//   what is generated from the model:  docs, `model.json`, and the portal's data file (declarations: no values, but visibility kept)
// Audiences, as callers: `keeper` (a principal holding the role), `stranger` (a principal not holding it), `anonymous` (public),
// and `telemetry` (a Collector's file). The `agent` audience is MCP, called as keeper and as stranger.
//
// Calls made where the design is silent:
//  1. R1 as the lead revised it (the row and Gate M1 (8) are to be corrected to it): a secret leaves only in the answer of the
//     call that issued it, to that call's own caller, through the direct doors (the HTTP body, the SDK's decoded answer, the CLI's
//     text and `--json`), for any caller the operation admits, anonymous included (sign-in is). It never leaves in a refusal, in a
//     read's answer (`locker.get` commits nothing), through MCP, or in spans, logs, metrics, the journal, the portal data file,
//     docs or the model. So `locker.open`'s answer carries `code` to keeper, stranger and anonymous over those three doors, and
//     everything else is judged as before. A control over acme: `api-key.create`'s HTTP answer carries its `key`, and no span, log
//     or journal entry does.
//     The mark is the declaration's: `code: Blueprint.issued(<secret>)` on `locker.open`'s answer (the fixture writes it only once
//     `Blueprint.issued` exists, so every control runs today), and a second secret answer field, `seal`, is NOT issued: no output
//     carries it for anyone. The compiler refuses `issued` on a public value and on a payload field.
//  2. The module's surface is pinned only by name (`Audience` and `Visibility` exported from `@orthograph/language-effect`;
//     `Audience` has `principal`, `agent`, `telemetry`, `public`, `owner`; `Visibility` has `sees`, `redact`, `schema`), never by
//     signature. `Errors.shown` is gone from the generated api (the row says so).
//  3. MCP is the agent audience. Whether an agent called by the keeper sees the private field is not judged (`shown.ts` today
//     shows it, the audience list gives `agent` no roles); it must show the public field and never the secret, the undeclared,
//     or the private field to the stranger. Anonymous has no MCP: the door is OAuth.
//  4. The keeper over HTTP, the SDK and the CLI sees the private `note` and `memo`; that a role-holder sees what is private to
//     the role is what `principal` with the roles held means.
//  5. Telemetry sees nothing that is not public, in spans, logs and metrics, and the journal keeps public fields only. A log
//     line the handler wrote that holds a secret or private value it loaded (not only one the caller sent) is redacted by value,
//     as `decided.ts` redacts hidden payload text today. `prove`'s own evals say the same ("appears in a log line"), so the
//     fixture's last journey step fails that eval today.
//  6. A refusal whose fields are private reaches the keeper with them and the stranger without (what MCP's `refusalLine` does).
//
// Red today on the missing surface (no `Audience`, no `visibility` module, `Errors.shown` still there) and on what leaks today:
// the HTTP body, the SDK, the CLI and the logs carry the secret and the private value to everyone; findings are in the report.
// The controls pass today and keep passing.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { Effect } from "effect";
import { Collectors } from "@orthograph/prove";
import { afterAll, describe, expect, it } from "vitest";
import { callAs } from "../layer2/mcp.ts";
import { acme, nothingRunning, run, textAt } from "./support.ts";
import { freePort, runCli, runSdk } from "./clients.ts";
import { captureAll, issues, OUTPUTS, shownIn, type Capture, type Captured, type Output } from "./visibility-outputs.ts";
import { filesUnder, hasIssued, leaks, liveWorld, lockerProject, overlay, missing, plant, sleep, spansNamed, tracesOf, until, type Live, type Name, type Who } from "./visibility.ts";

const planted = plant();
const NAMES = Object.keys(planted) as ReadonlyArray<Name>;

// ---- one project, one world, every output captured once ----

let project: ReturnType<typeof lockerProject> | undefined;
const theProject = () => (project ??= lockerProject(planted));
/** A second copy, for the runs of `ortho prove`, which start worlds of their own beside the one every output is read in. */
let proving: ReturnType<typeof lockerProject> | undefined;
const provingProject = () => (proving ??= lockerProject(planted));
let handle: ReturnType<typeof liveWorld> | undefined;
let started: Promise<{ readonly live: Live; readonly captured: Captured }> | undefined;
const ready = () => (started ??= (async () => {
  handle = liveWorld(theProject().root);
  const live = await handle.open();
  return { live, captured: await captureAll(theProject().root, live, planted) };
})());
afterAll(async () => {
  await handle?.close();
  for (const copy of [project, proving]) if (copy) { nothingRunning(copy.root); copy.remove(); }
});

const captures = async (output: Output) => (await ready()).captured.captures.filter((c) => c.output === output);
const where = (c: Capture) => `${c.output} ${c.call} as ${c.who}`;

/** The planted values a caller must not be shown but was, one line each. */
const leaked = (all: ReadonlyArray<Capture>) => all.flatMap((c) => leaks(c.bytes, c.who, planted, issues(c.output, c.call)).map((what) => `${where(c)}: ${what}`));
/** What the caller should have been shown and was not: an output that says nothing passes no rule. */
const absent = (all: ReadonlyArray<Capture>) => all.flatMap((c) => missing(c.bytes, c.who, planted, shownIn(c.output, c.call, c.who), issues(c.output, c.call)).map((what) => `${where(c)}: ${what}`));

// ---- the surface ----

describe("16 the surface: one visibility module, one Audience", () => {
  it("exports Audience (principal, agent, telemetry, public, owner) and Visibility (sees, redact, schema) from language-effect, and the generated api has no Errors.shown", () => {
    const probe = spawnSync(process.execPath, ["--input-type=module", "-e",
      `const m = await import("@orthograph/language-effect"); console.log(JSON.stringify({ audience: Object.keys(m.Audience ?? {}).sort(), visibility: Object.keys(m.Visibility ?? {}).sort() }));`],
    { cwd: acme, encoding: "utf8" });
    const found = probe.status === 0 ? (JSON.parse(probe.stdout.trim().split("\n").at(-1) ?? "{}") as { audience: Array<string>; visibility: Array<string> }) : { audience: [], visibility: [] };
    const absentNames = [
      ...["agent", "owner", "principal", "public", "telemetry"].filter((n) => !found.audience.includes(n)).map((n) => `Audience.${n}`),
      ...["redact", "schema", "sees"].filter((n) => !found.visibility.includes(n)).map((n) => `Visibility.${n}`),
      ...(/\bexport const shown\b/.test(readFileSync(join(acme, "generated/api/src/errors.ts"), "utf8")) ? ["Errors.shown is still generated (the row: it goes)"] : []),
    ];
    expect(absentNames, "M1.35: a `visibility` module in language-effect with one Audience, and sees, redact and schema; Errors.shown goes. A tripwire: it fails, it never skips.").toEqual([]);
  });
});

// ---- controls: what is true today, and must stay true ----

describe("16 the surface: Blueprint.issued marks a secret answer field the caller is given once", () => {
  it("exists, and ortho check refuses it on a public value and on a payload field, naming the field", () => {
    expect(hasIssued(), "`Blueprint.issued` is exported by orthograph (the lead's R1 revision)").toBe(true);
    const refused = (field: string, edit: (source: string) => string) => {
      const copy = overlay(planted, edit);
      try {
        const result = run(copy.root, "check");
        expect([result.status === 0, result.out.includes(field), /issued/.test(result.out)], `${field}: ${result.out}`).toEqual([false, true, true]);
        expect(result.out).not.toMatch(/does not exist|is not a function|Cannot read properties/);
      } finally { copy.remove(); }
    };
    refused("label", (source) => source.replace("label: Locker.fields.label,", "label: Blueprint.issued(Locker.fields.label),"));
    refused("locker", (source) => source.replace("payload: { locker: Locker.fields.id,", "payload: { locker: Blueprint.issued(Blueprint.visibility.secret(Locker.fields.id)),"));
  });
});

describe("16 controls: the planted values and the search", () => {
  it("each audience's search finds every value it must not see, in a JSON body, an OTLP attribute and a log line, and none it may", () => {
    const shapes = (value: string) => [`{"label":"x","v":"${value}"}`, `{"key":"answer.v","value":{"stringValue":"${value}"}}`, `opening it: the value is ${value}, as logged`];
    const kinds = { label: "public", hint: "public", note: "private", memo: "private", code: "secret", pin: "secret", seal: "secret", residue: "undeclared", residueRefusal: "undeclared" } as const;
    const whos: ReadonlyArray<Who> = ["keeper", "stranger", "anonymous", "telemetry"];
    for (const name of NAMES) {
      for (const who of whos) {
        const allowed = who === "keeper" ? kinds[name] === "public" || kinds[name] === "private" : kinds[name] === "public";
        for (const bytes of shapes(planted[name])) expect(leaks(bytes, who, planted), `${name} for ${who}`).toEqual(allowed ? [] : [`${name} (${kinds[name]})`]);
      }
    }
    expect(leaks("nothing planted here", "anonymous", planted)).toEqual([]);
    expect(leaks(planted.code, "anonymous", planted, true), "an issuing answer may carry the secret to anyone").toEqual([]);
    expect(leaks(`${planted.code} ${planted.pin}`, "anonymous", planted, true), "but never a refusal's secret").toEqual(["pin (secret)"]);
    expect(missing("", "keeper", planted, ["label", "note", "code"]), "an output that says nothing is missing what the keeper is shown, and never a secret").toEqual(["label (public)", "note (private)"]);
    expect(missing("", "anonymous", planted, ["label", "code"], true)).toEqual(["label (public)", "code (secret)"]);
  });

  it("the values are nine and distinct, none inside another, and only src/sentinels.ts of the project holds them", () => {
    const values = NAMES.map((name) => planted[name]);
    expect(new Set(values).size).toBe(9);
    for (const a of values) for (const b of values) if (a !== b) expect(b.includes(a), `${a} in ${b}`).toBe(false);
    const root = theProject().root;
    const holding = ["generated", "blueprint", "journeys", "src"].flatMap((dir) => filesUnder(root, dir)).filter((f) => values.some((v) => f.text.includes(v))).map((f) => f.path);
    expect(holding, "the planted values are in the project only where the check wrote them").toEqual(["src/sentinels.ts"]);
  });

  it("the fixture is a valid project: ortho check passes on acme with the locker laid over it, and the model marks the three visibilities", () => {
    const root = theProject().root;
    expect(run(root, "check").status, run(root, "check").out).toBe(0);
    const model = JSON.parse(run(root, "model", "--json").stdout) as { operations: Record<string, { answer: Record<string, { visibility?: unknown }> }> };
    expect(Object.keys(model.operations).filter((name) => name.startsWith("locker.")).sort()).toEqual(["locker.get", "locker.install", "locker.open"]);
    expect(Object.fromEntries(Object.entries(model.operations["locker.open"]!.answer).map(([k, f]) => [k, f.visibility ?? "public"]))).toEqual({
      locker: "public", label: "public", note: { private: ["organization.owner"] }, code: "secret", seal: "secret",
    });
  });

  it("a server that leaks is seen to leak through the SDK program and the CLI, so a clean output is not a blind one", async () => {
    const root = theProject().root;
    const body = JSON.stringify({ locker: "lkr_x", label: planted.label, note: planted.note, code: planted.code, seal: planted.seal, residue: planted.residue });
    const stub: Server = createServer((_request, response) => { response.writeHead(200, { "content-type": "application/json" }).end(body); });
    await new Promise<void>((resolve) => { stub.listen(0, "127.0.0.1", resolve); });
    const url = `http://127.0.0.1:${(stub.address() as AddressInfo).port}`;
    try {
      const sdk = await runSdk(root, "visibility-stub", `out(await settle(Sdk.locker.open({ locker: "lkr_x" as never, tool: "key" }).pipe(Effect.provide(Sdk.layer(env.URL)))));`, { URL: url });
      const cli = await runCli(root, { ACME_URL: url, ACME_TOKEN: "" }, "locker", "open", "--locker", "lkr_x", "--tool", "key", "--json");
      expect(leaks(sdk.stdout, "stranger", planted), "the SDK's decoded answer").toEqual(["note (private)", "code (secret)", "seal (secret)"]);
      expect(leaks(`${cli.stdout}${cli.stderr}`, "anonymous", planted), "the CLI's --json").toEqual(["note (private)", "code (secret)", "seal (secret)"]);
      const raw = await (await fetch(url)).text();
      expect(leaks(raw, "stranger", planted), "the HTTP body").toEqual(["note (private)", "code (secret)", "seal (secret)", "residue (undeclared)"]);
    } finally { await new Promise<void>((resolve) => { stub.close(() => resolve()); stub.closeAllConnections(); }); }
  });

  it("a record planted in a Collector is found in its file, so a clean trace file is not a blind one", async () => {
    const dir = join(theProject().root, ".ortho/visibility-collector");
    mkdirSync(dir, { recursive: true });
    const found = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const collector = yield* Collectors.local(dir, []);
      const record = { resourceLogs: [{ scopeLogs: [{ logRecords: [{ body: { stringValue: `the code is ${planted.code}` }, attributes: [{ key: "pin", value: { stringValue: planted.pin } }] }] }] }] };
      const sent = yield* Effect.promise(() => fetch(`${collector.url}/v1/logs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(record) }));
      expect(sent.status).toBe(200);
      return textAt(join(theProject().root, ".ortho"), "visibility-collector/logs.jsonl");
    })));
    expect(leaks(found, "telemetry", planted)).toEqual(["code (secret)", "pin (secret)"]);
  });

  it("the world answers the planted call: an answer, a refusal and a read reach every caller, with what each is shown", async () => {
    const all = (await ready()).captured.captures;
    expect(all.length, "five outputs, three callers, three calls; MCP for the two who can sign in").toBe(3 * 3 * 4 + 2 * 3);
    expect((await ready()).captured.installed.status, "the owner's locker was installed").toBe(200);
    const http = all.filter((c) => c.output === "http");
    expect(http.map((c) => [c.who, c.call, c.bytes.split("\n")[0]]), "the refusal is a 4xx, the rest 200").toEqual([
      ["keeper", "answer", "200"], ["keeper", "refusal", "422"], ["keeper", "read", "200"],
      ["stranger", "answer", "200"], ["stranger", "refusal", "422"], ["stranger", "read", "200"],
      ["anonymous", "answer", "200"], ["anonymous", "refusal", "422"], ["anonymous", "read", "200"],
    ]);
    expect(absent(all), "every output carries the values its caller is shown").toEqual([]);
  });
});

// ---- the journeys of the fixture operation ----

describe("16 M1.35 journeys: the fixture's journey fails on empty handlers and passes with its own", () => {
  it("ortho prove --empty fails every step of `open a locker` on a blank, and leaves the handlers as they were", async () => {
    const root = provingProject().root;
    const handlers = ["src/locker/install.ts", "src/locker/open.ts"];
    const originals = handlers.map((path) => textAt(root, path));
    const result = run(root, "prove", "--empty", "--only", "open a locker", "--port", String(await freePort()));
    expect(result.out.match(/^journey .*$/gm), result.out).toEqual(["journey open a locker ✘ 0/5 steps"]);
    expect(result.status, result.out).toBe(1);
    expect([...result.out.matchAll(/^ +✘ "([^"\n]+)"/gm)].map((line) => line[1])).toEqual([
      "ada puts a locker in her organisation", "the crowbar is refused, and nothing is committed", "bob is refused the same way", "ada opens it with the key", "bob reads it and sees what the public sees",
    ]);
    expect(result.out).toMatch(/✘ "ada puts a locker in her organisation"[^\n]*BlankReached[^\n]*insert/);
    expect(handlers.map((path) => textAt(root, path))).toEqual(originals);
    nothingRunning(root);
  });

  it("ortho prove passes `open a locker` with the fixture's handlers, and its evals find nothing non-public in a log line, a span or an answer", async () => {
    const root = provingProject().root;
    const result = run(root, "prove", "--only", "open a locker", "--port", String(await freePort()));
    expect(result.out.match(/^journey .*$/gm), result.out).toEqual(["journey open a locker ✔ 5/5 steps"]);
    const evals = result.out.split("\n").filter((line) => /^locker\.(open|install|get) /.test(line) && / evals? /.test(line));
    expect(evals.map((line) => line.replace(/ p50.*$/, "")), "locker.open's nine evals, and the others', all pass (a non-public value in a log line fails one today)").toEqual([
      "locker.get 9 evals ✔", "locker.install 9 evals ✔", "locker.open 9 evals ✔",
    ]);
    expect(result.out).not.toMatch(/\(not public\) appears in/);
    nothingRunning(root);
  });
});

// ---- the outputs a caller is answered through ----

const noLeak = async (output: Output) => leaked(await captures(output));
describe("16 M1.35: what a caller is answered with, for every audience (R1, R2, R3)", () => {
  it("HTTP: the answer's, the refusal's and the read's body show no secret, no undeclared field, and a private one only to its role", async () => {
    expect(await noLeak("http")).toEqual([]);
  });
  it("SDK: the decoded answer and the typed failure hold no secret, no undeclared field, and a private field only for its role", async () => {
    expect(await noLeak("sdk")).toEqual([]);
  });
  it("CLI: the text of an answer, a refusal and a read shows no secret, no undeclared field, and a private one only to its role", async () => {
    expect(await noLeak("cli")).toEqual([]);
  });
  it("CLI --json: the same, as JSON (and a refusal still goes to stderr with its exit code)", async () => {
    expect(await noLeak("cli-json")).toEqual([]);
  });
  it("MCP: a tool's result and error show no secret, no undeclared field, and the stranger no private field (the agent audience)", async () => {
    expect(await noLeak("mcp")).toEqual([]);
  });
});

describe("16 controls: each output shows its caller what the caller is shown", () => {
  for (const output of OUTPUTS) {
    it(`${output}: the public field to everyone, and the private one to the keeper (MCP's private case is not judged)`, async () => {
      const all = await captures(output);
      expect(all.length).toBe(output === "mcp" ? 6 : 9);
      expect(absent(all)).toEqual([]);
    });
  }
});

// ---- what the runtime says of every call ----

const settled = async (live: Live, captured: Captured) => {
  const asked = (call: string) => captured.captures.filter((c) => (call === "locker.get" ? c.call === "read" : c.call !== "read")).length;
  const want = { open: asked("locker.open"), get: asked("locker.get") };
  await until(() => live.collected(), (c) => spansNamed(c.traces, "locker.open") >= want.open && spansNamed(c.traces, "locker.get") >= want.get, 60_000);
  let size = -1;
  await until(async () => { await sleep(2_000); const c = live.collected(); const now = c.traces.length + c.logs.length; const same = now === size; size = now; return same; }, (same) => same, 30_000);
  return { collected: live.collected(), want };
};

describe("16 M1.35: what the runtime says of every call, for the telemetry audience (R1, R2, R3)", () => {
  it("control: the Collector holds a span for every call, the handler's own log line, and the journal holds the commits' public fields", async () => {
    const { live, captured } = await ready();
    const { collected, want } = await settled(live, captured);
    expect([spansNamed(collected.traces, "locker.open"), spansNamed(collected.traces, "locker.get")], "one operation span per call, MCP's and the CLI's included").toEqual([want.open, want.get]);
    expect(collected.logs, "the handler's log line reached the Collector (its traced public label proves the capture sees it, a value O2 allows in logs)").toContain(planted.label);
    const journal = (await Promise.all(tracesOf(collected.traces, "locker.open").map((trace) => live.journal(trace)))).join("\n");
    expect(journal, "the journal holds LockerOpened with its public field").toContain("LockerOpened");
    expect(journal).toContain(planted.label);
  });

  it("spans: no operation, step or commit span carries a secret, a private value or an undeclared one", async () => {
    const { live, captured } = await ready();
    expect(leaks((await settled(live, captured)).collected.traces, "telemetry", planted)).toEqual([]);
  });

  it("logs: no log record, the handler's own line and the one that decided a refusal included, carries one", async () => {
    const { live, captured } = await ready();
    expect(leaks((await settled(live, captured)).collected.logs, "telemetry", planted)).toEqual([]);
  });

  it("metrics: no metric attribute carries one", async () => {
    const { live, captured } = await ready();
    expect(leaks((await settled(live, captured)).collected.metrics, "telemetry", planted)).toEqual([]);
  });

  it("the journal: no entry of any call's trace carries one", async () => {
    const { live, captured } = await ready();
    const { collected } = await settled(live, captured);
    const traces = [...tracesOf(collected.traces, "locker.open"), ...tracesOf(collected.traces, "locker.install")];
    const journal = (await Promise.all(traces.map((trace) => live.journal(trace)))).join("\n");
    expect(leaks(journal, "telemetry", planted)).toEqual([]);
  });
});

// ---- what is generated from the model ----

describe("16 controls: an issued secret on acme, api-key.create", () => {
  it("the HTTP answer carries the key, and no span, log, metric or journal entry does", async () => {
    const { live, captured } = await ready();
    const cast = await live.cast("ada");
    const ada = cast["ada"]!;
    const response = await fetch(`${live.url}/api-key/create`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${ada.token}` }, body: JSON.stringify({ organization: captured.organization, name: "ci" }) });
    const text = await response.text();
    expect(response.status, text).toBe(200);
    const key = (JSON.parse(text) as { key?: string }).key ?? "";
    const agent = await callAs(live.url, ada, "api-key.create", { organization: captured.organization, name: "agent" });
    expect(agent.text.includes(key), "no MCP result carries it").toBe(false);
    expect(key.length, "the answer carries the key").toBeGreaterThan(8);
    const collected = (await until(() => live.collected(), (c) => spansNamed(c.traces, "api-key.create") >= 1, 60_000));
    await sleep(3_000);
    const after = live.collected();
    expect(spansNamed(after.traces, "api-key.create")).toBeGreaterThanOrEqual(1);
    const journal = (await Promise.all(tracesOf(collected.traces, "api-key.create").map((trace) => live.journal(trace)))).join("\n");
    expect([after.traces, after.logs, after.metrics, journal].map((bytes) => bytes.includes(key))).toEqual([false, false, false, false]);
  });
});

describe("16 M1.35: what is generated from the model", () => {
  it("docs, the model and the portal's data file hold no planted value, and the portal's data file keeps every field's visibility as the model has it", () => {
    const root = theProject().root;
    const generated = ["docs/locker", "model", "portal", "mcp", "sdk", "cli", "api"].flatMap((dir) => filesUnder(root, `generated/${dir}`));
    expect(generated.length).toBeGreaterThan(20);
    expect(generated.flatMap((f) => leaks(f.text, "anonymous", planted).map((what) => `${f.path}: ${what}`))).toEqual([]);

    const model = JSON.parse(textAt(root, "generated/model/model.json")) as { things: Record<string, { fields: Record<string, { visibility?: unknown }>; errors: Record<string, { fields: Record<string, { visibility?: unknown }> }> }> };
    const portal = JSON.parse(textAt(root, "generated/portal/blueprint.json")) as { model: typeof model };
    const marks = (m: typeof model) => ({ fields: Object.fromEntries(Object.entries(m.things["locker"]!.fields).map(([k, f]) => [k, f.visibility ?? "public"])), refusal: Object.fromEntries(Object.entries(m.things["locker"]!.errors["LockerSealed"]!.fields).map(([k, f]) => [k, f.visibility ?? "public"])) });
    expect(marks(model).fields["code"], "the model says what the declaration says").toBe("secret");
    expect(marks(model).refusal["pin"]).toBe("secret");
    expect(marks(portal.model), "the portal's data file drops no field's visibility").toEqual(marks(model));
    const docs = textAt(root, "generated/docs/locker/open.md");
    expect(docs).toMatch(/\| code \| locker\.code \(secret\)/);
    expect(docs).toMatch(/\| note \| locker\.note \(private to organization\.owner\)/);
  });
});
