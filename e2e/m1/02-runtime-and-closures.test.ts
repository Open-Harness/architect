// Check 02 (M1.09): a mounted feature runs. Its handler answers through the typed SDK, HTTP and a fresh worker's first MCP
// call in real workerd; `ortho prove` runs the feature's own journey and its nine evals; a changed pick changes the
// answer; and the import closures hold the import rule of M1-plugins section 8 on the real files bundled.
//
// This file mounts by hand (M1.06) and never uses `ortho add` (M1.10), so it judges M1.09 alone.
// Assumptions: the MCP tool is named as the operation (`echo.repeat`); a handler failure reaches the prove report by the
// error's name (`BlankReached`) or its message, as Codex's original asserted.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Prove, Worlds } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { callAs } from "../layer2/mcp.ts";
import { bundle, filesOf, typecheckSdk, violations } from "./closures.ts";
import { PORTS, echoJourneyTitle, model, mountEcho, nothingRunning, project, succeeds, type Copy, type Style } from "./support.ts";

const copies: Array<Copy> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

/** acme with the echo feature installed, mounted by hand with a pick, and generated. */
const ready = (options: { readonly variant?: string; readonly pick?: Style } = {}) => {
  const copy = project({ kind: "echo", ...(options.variant ? { variant: options.variant } : {}) });
  copies.push(copy);
  mountEcho(copy.root, { pick: options.pick ?? "plain" });
  succeeds(copy.root, "generate");
  return copy;
};

const sdkCall = (root: string, url: string, operation: string, payload: string) => {
  const dir = join(root, ".ortho/sdk-call");
  mkdirSync(dir, { recursive: true });
  const entry = join(dir, "main.ts");
  writeFileSync(entry, [
    'import { Effect } from "effect";',
    'import * as Sdk from "../../generated/sdk/src/index.ts";',
    `const answer = await Effect.runPromise(Sdk.${operation}(${payload}).pipe(Effect.provide(Sdk.layer(process.argv[2]!))));`,
    "console.log(JSON.stringify(answer));", ""].join("\n"));
  const called = spawnSync(process.execPath, [entry, url], { cwd: root, encoding: "utf8", timeout: 60_000 });
  expect(called.status, called.stdout + called.stderr).toBe(0);
  return JSON.parse(called.stdout) as unknown;
};
const post = (url: string, path: string, body: unknown) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("02 runtime: the plugin's handler answers in a real world", () => {
  it("the typed SDK and HTTP both answer from the feature's handler; the generated SDK is typed and holds no plugin source", async () => {
    const copy = ready();
    typecheckSdk(copy.root, { access: "echo.repeat", payload: '{ text: "hello" }', wrong: "{ text: 7 }" }, [/@fixture\/echo\/dist\/src\//]);
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const world = yield* Worlds.start({ root: copy.root, port: PORTS.sdk, name: "m1-feature-http" });
      expect(sdkCall(copy.root, world.url, "echo.repeat", '{ text: "hello" }')).toEqual({ text: "hello" });
      expect(sdkCall(copy.root, world.url, "echo.shout", '{ text: "hello" }')).toEqual({ text: "HELLO!" });
      const response = yield* Effect.promise(() => post(world.url, "/echo/repeat", { text: "hello" }));
      expect(response.status).toBe(200);
      expect(yield* Effect.promise(() => response.json())).toEqual({ text: "hello" });
      const wrong = yield* Effect.promise(() => post(world.url, "/echo/repeat", { text: 7 }));
      expect(wrong.status).toBeGreaterThanOrEqual(400);
    })));
    nothingRunning(copy.root);
  });

  it("a changed pick changes the answer, and the model records it", async () => {
    const copy = ready({ pick: "loud" });
    expect(model(copy.root).mounts?.["echo"]?.chosen).toEqual({ style: "loud" });
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const world = yield* Worlds.start({ root: copy.root, port: PORTS.loud, name: "m1-feature-loud" });
      expect(sdkCall(copy.root, world.url, "echo.repeat", '{ text: "hello" }')).toEqual({ text: "HELLO" });
      const response = yield* Effect.promise(() => post(world.url, "/echo/shout", { text: "hello" }));
      expect(yield* Effect.promise(() => response.json())).toEqual({ text: "HELLO!!!" });
    })));
    nothingRunning(copy.root);
  });

  it("a fresh worker's first call may be MCP: the plugin's mount is provided before anything else warms it", async () => {
    const copy = ready({ pick: "loud" });
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const world = yield* Worlds.start({ root: copy.root, port: PORTS.mcp, name: "m1-feature-mcp" });
      const who = { email: "echo@acme.test", password: "not-a-real-person-password" };
      const response = yield* Effect.promise(() => fetch(`${world.url}/api/auth/sign-up/email`, { method: "POST",
        headers: { "content-type": "application/json", origin: world.url }, body: JSON.stringify({ ...who, name: "echo" }) }));
      expect(response.status).toBe(200);
      const called = yield* Effect.promise(() => callAs(world.url, who, "echo.repeat", { text: "hello" }));
      expect(called.isError, called.text).toBe(false);
      // The pick is read through the mount on this door too: loud, not the plain default.
      expect(called.text).toContain('"text":"HELLO"');
    })));
    nothingRunning(copy.root);
  });

  it("prove runs the feature's own journey beside the app's, with every operation's nine evals", async () => {
    const copy = ready();
    const report = await Effect.runPromise(Effect.scoped(Prove.run({ root: copy.root, port: PORTS.prove })));
    expect(report.passed, report.lines.join("\n")).toBe(true);
    expect(report.lines).toContain(`journey ${echoJourneyTitle} ✔ 2/2 steps`);
    expect(report.lines.filter((line) => /^journey .* ✔ \d+\/\d+ steps$/.test(line))).toHaveLength(16);
    for (const name of ["echo.repeat", "echo.shout", "allowance.spend", "system.health"]) expect(report.lines.some((line) => line.startsWith(`${name} 9 evals ✔`)), name).toBe(true);
    expect(report.lines.filter((line) => / 9 evals ✔ /.test(line))).toHaveLength(17);
    nothingRunning(copy.root);
  });
});

describe("02 closures: the import rule on the real import closure", () => {
  it("api and sdk hold the descriptor and blueprint/* of the plugin only; the worker never holds a .node.js or .browser.js entry", () => {
    const copy = ready();
    const api = bundle(copy.root, "generated/api/src/index.ts", "api");
    const sdk = bundle(copy.root, "generated/sdk/src/index.ts", "sdk");
    const worker = bundle(copy.root, "generated/server/main.ts", "worker");
    expect(filesOf(copy.root, api)).toContain("dist/blueprint/things/echo/verbs/repeat.js");
    expect(violations(copy.root, api, "client")).toEqual([]);
    expect(violations(copy.root, sdk, "client")).toEqual([]);
    // The server really imports the plugin's handlers from the package, and not its Node or browser code.
    expect(filesOf(copy.root, worker)).toEqual(expect.arrayContaining(["dist/src/echo/repeat.js", "dist/src/echo/shout.js", "dist/blueprint/things/echo/verbs/repeat.js"]));
    expect(violations(copy.root, worker, "worker")).toEqual([]);
    expect(filesOf(copy.root, worker).filter((file) => /\.(?:node|browser)\.js$/.test(file))).toEqual([]);
  });

  it("the check can see: a planted client importing a Node entry is caught, node:crypto and all (a control: nothing is mounted)", () => {
    const copy = project("echo");
    copies.push(copy);
    mkdirSync(join(copy.root, ".ortho"), { recursive: true });
    const planted = join(copy.root, ".ortho/planted-client.ts");
    writeFileSync(planted, 'export { default as fingerprint } from "@fixture/echo/src/echo/repeat.node.js";\nexport { default as same } from "@fixture/echo/src/echo/repeat.browser.js";\n');
    const caught = violations(copy.root, bundle(copy.root, planted, "planted-client"), "client");
    expect(caught).toContain("@fixture/echo:dist/src/echo/repeat.node.js");
    expect(caught).toContain("@fixture/echo:dist/src/echo/repeat.browser.js");
    expect(caught).toContain("node:crypto");
    const plantedWorker = join(copy.root, ".ortho/planted-worker.ts");
    writeFileSync(plantedWorker, 'export { default as fingerprint } from "@fixture/echo/src/echo/repeat.node.js";\n');
    expect(violations(copy.root, bundle(copy.root, plantedWorker, "planted-worker"), "worker")).toContain("@fixture/echo:dist/src/echo/repeat.node.js");
  });

  it("a client importing the plugin's handler is caught too: src/* is for the host it runs on, and a client is no host", () => {
    const copy = ready();
    const planted = join(copy.root, ".ortho/planted-handler.ts");
    mkdirSync(join(copy.root, ".ortho"), { recursive: true });
    writeFileSync(planted, 'export { default as repeat } from "@fixture/echo/src/echo/repeat.js";\n');
    expect(violations(copy.root, bundle(copy.root, planted, "planted-handler"), "client")).toContain("@fixture/echo:dist/src/echo/repeat.js");
  });
});

describe("02 failures: a handler that is empty or dies fails the feature's own journey", () => {
  for (const [variant, marker, port] of [["empty-handler", "BlankReached", PORTS.empty], ["defect-handler", "authored feature repeat defect", PORTS.defect]] as const) {
    it(`the ${variant} variant makes prove fail, naming what happened`, async () => {
      const copy = ready({ variant });
      const report = await Effect.runPromise(Effect.scoped(Prove.run({ root: copy.root, port })));
      expect(report.passed).toBe(false);
      expect(report.lines.join("\n")).toContain(marker);
      expect(report.lines.join("\n")).toContain(`journey ${echoJourneyTitle} ✘`);
      nothingRunning(copy.root);
    });
  }
});
