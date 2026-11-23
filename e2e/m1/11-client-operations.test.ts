// Check 11 (M1.27): an operation that runs on the device. `@fixture/device` has one `runs: "client"` operation,
// `receipt.stamp`, with two declared steps and a code entry for each host (node, browser, world). The generated SDK and CLI
// run it in the caller's own process with no server call, its steps are spans, the portal lists them, and the same plugin
// without its browser entry is refused.
//
// Assumptions beyond K7 ("operations that run on the device") and M1-plugins sections 1 and 8, where the design is silent:
//  1. The fixture mounts by hand as `blueprint/features/device.ts` (M1.06), so this check judges M1.27 alone. The
//     operation is `receipt.stamp` (thing `receipt`, verb `stamp`); `ortho model --json` says `runs: "client"` for it
//     (today the model hard-codes `server`), keeps its two steps as `receipt.stamp.prepare` and `receipt.stamp.seal`
//     (type `wait`), and its `from` names `@fixture/device`.
//  2. A client operation's host entries are `src/<thing>/<verb>.{node,browser,world}.js` in the plugin, each a default
//     export `Handler` (the names the wallet stand-in of check 09 already uses). The compiler accepts the operation when
//     all three exist and refuses it when one is missing, at `ortho generate`, nothing written, naming the operation, the
//     package and the host word (`browser`), as section 8 does for a missing worker handler.
//  3. The generated SDK and CLI of a client operation have the same shape as a server one's: `Sdk.receipt.stamp(payload)`
//     provided with `Sdk.layer(url)`, and `generated/cli/src/main.ts receipt stamp --text <t> --json` talking to
//     `ACME_URL`. Neither reaches that URL for this operation; run from Node, each runs the `node` entry (the answer says
//     `host: "node"`, and its stamp is a sha256 only the node entry's `node:crypto` makes). Which entry a browser or a
//     world picks is not judged here (that needs a browser and a journey actor, and the wallet journeys are check 09's).
//  4. No server call is proved by an HTTP listener on 127.0.0.1 that records every request and answers 503, given as the
//     SDK's and the CLI's server address: it must see nothing. A control shows it does see a server operation's call
//     (`system.health` from the same CLI). Both listeners bind port 0, and files run one at a time.
//  5. The in-process run exports its spans over OTLP/HTTP JSON to `$OTEL_EXPORTER_OTLP_ENDPOINT/v1/traces`, the standard
//     variable and path the Worker already uses, and has sent them before the SDK's Effect completes and before the CLI
//     exits. One trace per call: the operation's span `receipt.stamp` (attribute `operation`), and as its children
//     `receipt.stamp.prepare` then `receipt.stamp.seal` (attribute `step.kind` `wait`), none ending in error.
//  6. Where "the portal" reads spans. The portal package reads a blueprint and the logbook, not spans: it lists each
//     operation's declared steps on `/portal/operations/<name>` (K19: the data API `/_portal/v1/blueprint` over `generated/portal/blueprint.json`).
//     Spans are read through `TraceSource` (`FileSource.open`), the seam prove, `ortho telemetry trace` and `watch` use,
//     over OTLP JSON lines in `traces.jsonl`. The Collector that writes those files is a process prove starts (a pinned binary,
//     M1.33), which this check never starts: a receiver in this file writes the same lines (a control posts a span to it and
//     reads it back through `FileSource`). So this check runs in CI as it is. Seeing the same spans written by the real
//     Collector is prove's own telemetry test, not repeated here.
//  7. e2e now depends on `@orthograph/portal` (workspace), and `@orthograph/portal/server`, to ask the server half for the data as the Worker does.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { Wire } from "@orthograph/portal";
import { PortalServer } from "@orthograph/portal/server";
import { FileSource } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { bundle, filesOf } from "./closures.ts";
import { digest, model, project, run, succeeds, tree, writeMount, type Copy } from "./support.ts";

const copies: Array<Copy> = [];
const stops: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const copy of copies.splice(0)) copy.remove();
  for (const stop of stops.splice(0)) await stop();
});

/** acme with @fixture/device installed (a variant of it, or as shipped), mounted by hand. Not generated. */
const mounted = (variant?: string) => {
  const copy = project({ kind: "device", ...(variant ? { variant } : {}) });
  copies.push(copy);
  writeMount(copy.root, "feature", "device", { pkg: "@fixture/device" });
  return copy;
};
/** The same, and generated, which must succeed. */
const ready = () => {
  const copy = mounted();
  succeeds(copy.root, "generate");
  return copy;
};

// ---- the instruments: two real HTTP listeners and a process runner ----

const listen = (answer: (request: IncomingMessage, body: string) => { readonly status: number; readonly body: string }) =>
  new Promise<{ readonly url: string; readonly stop: () => Promise<void> }>((resolve) => {
    const server = createServer((request, response) => {
      const chunks: Array<Buffer> = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        const result = answer(request, Buffer.concat(chunks).toString("utf8"));
        response.writeHead(result.status, { "content-type": "application/json" });
        response.end(result.body);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve({
      url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      stop: () => new Promise<void>((done) => { server.closeAllConnections(); server.close(() => done()); }),
    }));
  });

/**
 * The server the SDK and CLI are pointed at, which records every request and answers 503, and a collector's OTLP/HTTP
 * receiver that writes what it is sent, one export a line, to `<dir>/traces.jsonl` as the Collector's file exporter does.
 */
const instruments = async () => {
  const requests: Array<string> = [];
  const strays: Array<string> = [];
  const dir = mkdtempSync(join(tmpdir(), "ortho-m1-device-"));
  const server = await listen((request) => { requests.push(`${request.method} ${request.url}`); return { status: 503, body: "{}" }; });
  const collector = await listen((request, body) => {
    if (request.method === "POST" && request.url === "/v1/traces") {
      appendFileSync(join(dir, "traces.jsonl"), `${JSON.stringify(JSON.parse(body))}\n`);
      return { status: 200, body: "{}" };
    }
    strays.push(`${request.method} ${request.url}`);
    return { status: 404, body: "{}" };
  });
  stops.push(server.stop, collector.stop, () => { rmSync(dir, { recursive: true, force: true }); return Promise.resolve(); });
  return { requests, strays, server: server.url, collector: collector.url, dir, source: FileSource.open(dir) };
};
type Instruments = Awaited<ReturnType<typeof instruments>>;

/** A process, run without blocking this one: the listeners above must answer while it runs. */
const exec = (args: ReadonlyArray<string>, options: { readonly cwd: string; readonly env: Record<string, string> }) =>
  new Promise<{ readonly status: number | null; readonly stdout: string; readonly stderr: string }>((resolve) => {
    const child = spawn(process.execPath, [...args], { cwd: options.cwd, env: { ...process.env, ...options.env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });

const text = "  Hello ";
/** What the node entry stamps: sha256 of the prepared text (trimmed, lower case), its first 16 hex digits. */
const nodeStamp = `node:${createHash("sha256").update("hello").digest("hex").slice(0, 16)}`;

/** The typed SDK, called from a program of the project's own, in a Node process. */
const sdkStamp = async (root: string, world: Instruments) => {
  const dir = join(root, ".ortho/sdk-call");
  mkdirSync(dir, { recursive: true });
  const entry = join(dir, "main.ts");
  writeFileSync(entry, [
    'import { Effect } from "effect";',
    'import * as Sdk from "../../generated/sdk/src/index.ts";',
    `const answer = await Effect.runPromise(Sdk.receipt.stamp({ text: ${JSON.stringify(text)} }).pipe(Effect.provide(Sdk.layer(process.argv[2]!))));`,
    "console.log(JSON.stringify(answer));", ""].join("\n"));
  return exec([entry, world.server], { cwd: root, env: { OTEL_EXPORTER_OTLP_ENDPOINT: world.collector } });
};
/** The generated CLI: `acme receipt stamp --text … --json`. */
const cliStamp = (root: string, world: Instruments) =>
  exec([join(root, "generated/cli/src/main.ts"), "receipt", "stamp", "--text", text, "--json"], { cwd: root, env: { ACME_URL: world.server, OTEL_EXPORTER_OTLP_ENDPOINT: world.collector } });

/** The traces that hold the operation's own span, as `TraceSource` reads them. */
const stampTraces = async (world: Instruments) => {
  const all = await Effect.runPromise(world.source.window(600_000));
  return [...all.values()].filter((trace) => trace.spans.some((span) => span.name === "receipt.stamp"));
};

describe("11 the instruments: a control that works today", () => {
  it("the recording server sees a server operation's call (system.health from the generated CLI), so seeing nothing means nothing was called", async () => {
    const copy = project();
    copies.push(copy);
    const world = await instruments();
    await exec([join(copy.root, "generated/cli/src/main.ts"), "system", "health"], { cwd: copy.root, env: { ACME_URL: world.server } });
    expect(world.requests.length, "a call to a server operation must reach the recording server").toBeGreaterThan(0);
    expect(world.requests.join("\n")).toMatch(/health/);
  });

  it("the receiver writes what the Collector's file exporter writes: a span posted to it is read back through FileSource", async () => {
    const world = await instruments();
    const nanos = BigInt(Date.now()) * 1_000_000n;
    const traceId = "0af7651916cd43dd8448eb211c80319c";
    const posted = await fetch(`${world.collector}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      resourceSpans: [{ resource: { attributes: [] }, scopeSpans: [{ scope: { name: "control" }, spans: [{
        traceId, spanId: "b7ad6b7169203331", name: "control.span", kind: 1, startTimeUnixNano: String(nanos), endTimeUnixNano: String(nanos + 1_000_000n),
        attributes: [{ key: "step.kind", value: { stringValue: "wait" } }], status: { code: 1 } }] }] }] }) });
    expect(posted.status).toBe(200);
    const found = await Effect.runPromise(world.source.find(traceId));
    expect(found?.spans.map((span) => [span.name, span.attrs["step.kind"]])).toEqual([["control.span", "wait"]]);
    expect(world.strays).toEqual([]);
  });
});

describe("11 generate: the compiler accepts a client operation whose plugin supplies node, browser and world", () => {
  it("ortho generate succeeds; the model says client, with the two steps; the SDK and CLI have it; the worker holds none of its code", () => {
    const copy = ready();
    const operation = model(copy.root).operations["receipt.stamp"];
    expect(operation, "no receipt.stamp in the model").toBeDefined();
    expect(operation?.runs).toBe("client");
    const from = operation?.from as { readonly kind?: string; readonly package?: string } | undefined;
    expect(from?.kind === "app" ? undefined : from?.package, "the operation comes from the plugin, not the app").toBe("@fixture/device");
    expect(Object.fromEntries(Object.entries(operation?.["steps"] as Record<string, { name: string; type: string }>).map(([key, step]) => [key, [step.name, step.type]]))).toEqual({
      prepare: ["receipt.stamp.prepare", "wait"], seal: ["receipt.stamp.seal", "wait"],
    });
    expect(readFileSync(join(copy.root, "generated/sdk/src/receipt/stamp.ts"), "utf8")).toContain("// Generated from");
    expect(readFileSync(join(copy.root, "generated/cli/src/receipt/stamp.ts"), "utf8")).toContain("// Generated from");
    // Nothing runs on the server: no entry of the plugin's receipt.stamp, for any host, is in the worker's real import closure.
    const worker = bundle(copy.root, "generated/server/main.ts", "worker");
    expect(filesOf(copy.root, worker, "@fixture/device").filter((file) => file.startsWith("dist/src/receipt/stamp"))).toEqual([]);
  });
});

describe("11 the SDK and the CLI run it in-process, with no server call", () => {
  it("the typed SDK answers from the node entry, and the server it was given never hears of it", async () => {
    const copy = ready();
    const world = await instruments();
    const called = await sdkStamp(copy.root, world);
    expect(called.status, called.stdout + called.stderr).toBe(0);
    expect(JSON.parse(called.stdout)).toEqual({ stamp: nodeStamp, host: "node" });
    expect(world.requests, "the SDK called the server for a client operation").toEqual([]);
  });

  it("the generated CLI answers the same, with its exit code 0, and its server hears nothing", async () => {
    const copy = ready();
    const world = await instruments();
    const called = await cliStamp(copy.root, world);
    expect(called.status, called.stdout + called.stderr).toBe(0);
    expect(JSON.parse(called.stdout)).toEqual({ stamp: nodeStamp, host: "node" });
    expect(world.requests, "the CLI called the server for a client operation").toEqual([]);
  });
});

describe("11 the steps are spans, and the portal shows them", () => {
  it("each call, from the SDK and from the CLI, is one trace: the operation's span, with prepare then seal as its children, none in error", async () => {
    const copy = ready();
    const world = await instruments();
    for (const called of [await sdkStamp(copy.root, world), await cliStamp(copy.root, world)]) expect(called.status, called.stdout + called.stderr).toBe(0);
    expect(world.requests).toEqual([]);
    const traces = await stampTraces(world);
    expect(traces, "one trace for the SDK's call and one for the CLI's").toHaveLength(2);
    for (const trace of traces) {
      const root = trace.spans.find((span) => span.name === "receipt.stamp")!;
      expect(root.attrs["operation"]).toBe("receipt.stamp");
      const children = trace.spans.filter((span) => span.parentSpanId === root.spanId).sort((a, b) => a.start - b.start);
      expect(children.map((span) => span.name)).toEqual(["receipt.stamp.prepare", "receipt.stamp.seal"]);
      expect(children.map((span) => span.attrs["step.kind"])).toEqual(["wait", "wait"]);
      expect([root, ...children].map((span) => span.status), "no span of a good call ends in error").not.toContain(2);
      expect(trace.spans.map((span) => span.name).sort()).toEqual(["receipt.stamp", "receipt.stamp.prepare", "receipt.stamp.seal"]);
    }
    expect(world.strays).toEqual([]);
  });

  it("the portal's data for the operation lists both declared steps, from the blueprint generate wrote", async () => {
    const copy = ready();
    const file = JSON.parse(readFileSync(join(copy.root, "generated/portal/blueprint.json"), "utf8")) as unknown;
    const steps = (blueprint: { model: { operations: Record<string, { steps: Record<string, { name: string; type: string }> }> } }) => Object.values(blueprint.model.operations["receipt.stamp"]?.steps ?? {});
    expect(steps(file as Parameters<typeof steps>[0]).map((step) => step.name)).toEqual(["receipt.stamp.prepare", "receipt.stamp.seal"]);
    // K19: the Worker answers `/_portal/v1/blueprint` from `@orthograph/portal/server`; the page is drawn from it.
    const decoded = await Effect.runPromise(Wire.decode(file));
    const response = await Effect.runPromise(PortalServer.handle({ blueprint: decoded, reader: null, bundleRevision: null }, new Request("http://portal/_portal/v1/blueprint")));
    expect(response.status).toBe(200);
    const served = await response.json() as Parameters<typeof steps>[0];
    expect(steps(served).map((step) => `${step.name} (${step.type})`)).toEqual(["receipt.stamp.prepare (wait)", "receipt.stamp.seal (wait)"]);
  });
});

describe("11 refusal: a client operation missing a host entry is refused, and nothing is generated", () => {
  it("without its browser entry, ortho generate refuses, naming the operation, the package and the host, after the whole plugin generated as a control", () => {
    // The control: the plugin as shipped generates. Only then can the refusal be about the missing entry.
    ready();
    const copy = mounted("no-browser");
    const before = digest(copy.root, "generated");
    const result = run(copy.root, "generate");
    expect(result.status, result.out).not.toBe(0);
    for (const name of ["receipt.stamp", "@fixture/device", "browser"]) expect(result.out, `the refusal should name ${name}\n${result.out}`).toContain(name);
    expect(result.out).not.toMatch(/is not supported yet|language-noir|unknown command|is not a function|Cannot read properties|SyntaxError|ERR_MODULE_NOT_FOUND/i);
    expect(digest(copy.root, "generated"), "a refused generate leaves generated/ as it was").toEqual(before);
    expect(tree(copy.root, "generated").filter((path) => path.includes("receipt"))).toEqual([]);
  });
});
