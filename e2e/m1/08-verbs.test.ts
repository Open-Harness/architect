// Check 08 (M1.07): choose, narrow and omit change the model and generated/ as M1-plugins section 3 says; `include` is an
// adapter's verb and is judged by checks 03 and 04.
//
// Assumptions beyond M1-plugins: `narrowed` lists the kept ways in by name (`key`, `session`, `device`, `agent`), compared
// here as a set; a skipped journey is reported with the word "skipped" and names the omitted operation; an MCP call of a tool
// that isn't there is an error result or a thrown error, not an answer; `Via.agent` is how MCP is told apart (section 3).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Prove, Worlds } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { callAs } from "../layer2/mcp.ts";
import { PORTS, declaration, echoJourneyTitle, model, mountEcho, nothingRunning, project, refuses, succeeds, textAt, tree, type Copy } from "./support.ts";

const copies: Array<Copy> = [];
const fresh = () => { const copy = project("echo"); copies.push(copy); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const shout = declaration("shout", "echo", "shout");
const repeat = declaration("repeat", "echo", "repeat");
const generatedText = (root: string) => tree(root, "generated").map((path) => textAt(root, path)).join("\n");
const post = (url: string, path: string, body: unknown) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const omitShout = (root: string) => mountEcho(root, { imports: [shout], verbs: ["p.omit(shout)"] });
const narrowRepeat = (root: string, via = "[Via.session, Via.key]") => mountEcho(root, { via: true, imports: [repeat], verbs: [`p.narrow(repeat, { via: ${via} })`] });

describe("08 verbs: omit", () => {
  it("an omitted operation is not in the model, and nothing is generated for it", () => {
    const { root } = fresh();
    mountEcho(root);
    const whole = model(root);
    succeeds(root, "generate");
    expect(generatedText(root)).toContain("echo/shout");
    omitShout(root);
    const got = model(root);
    expect(Object.keys(got.operations)).toContain("echo.repeat");
    expect(Object.keys(got.operations)).not.toContain("echo.shout");
    expect(Object.keys(got.operations).length).toBe(Object.keys(whole.operations).length - 1);
    expect(got.mounts?.["echo"]?.omitted).toEqual(["echo.shout"]);
    succeeds(root, "generate");
    for (const path of ["generated/api/src/echo/shout.ts", "generated/sdk/src/echo/shout.ts", "generated/cli/src/echo/shout.ts"]) expect(existsSync(join(root, path)), path).toBe(false);
    expect(existsSync(join(root, "generated/api/src/echo/repeat.ts"))).toBe(true);
    const modelFiles = ["generated/model/model.json", "generated/portal/blueprint.json"];
    for (const path of modelFiles) expect(textAt(root, path).replaceAll('"echo.shout"', "").match(/echo[./]shout/g) ?? [], path).toEqual([]);
    const everything = tree(root, "generated").filter((path) => !modelFiles.includes(path)).map((path) => textAt(root, path)).join("\n");
    expect(everything).not.toMatch(/echo\.shout|echo\/shout|echo\/shout\.js/);
    expect(everything).toContain("echo.repeat");
    expect(textAt(root, "generated/sdk/src/echo/index.ts")).not.toContain("shout");
  });

  it("the world serves what is left and no route for what was omitted", async () => {
    const { root } = fresh();
    omitShout(root);
    succeeds(root, "generate");
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const world = yield* Worlds.start({ root, port: PORTS.omit, name: "m1-feature-omit" });
      const kept = yield* Effect.promise(() => post(world.url, "/echo/repeat", { text: "hello" }));
      expect(kept.status).toBe(200);
      const gone = yield* Effect.promise(() => post(world.url, "/echo/shout", { text: "hello" }));
      expect(gone.status).toBe(404);
    })));
    nothingRunning(root);
  });

  it("a journey that runs an omitted operation is skipped and named by prove, which still passes", async () => {
    const { root } = fresh();
    omitShout(root);
    succeeds(root, "generate");
    const report = await Effect.runPromise(Effect.scoped(Prove.run({ root, port: PORTS.journey })));
    const text = report.lines.join("\n");
    expect(report.passed, text).toBe(true);
    expect(text).toMatch(/skipped/i);
    expect(text).toContain(echoJourneyTitle);
    expect(report.lines.some((line) => /skipped/i.test(line) && line.includes("echo.shout")), text).toBe(true);
    expect(report.lines.some((line) => line.startsWith("echo.repeat 9 evals ✔"))).toBe(true);
    expect(report.lines.some((line) => line.startsWith("echo.shout "))).toBe(false);
    nothingRunning(root);
  });

  it("omitting an operation that isn't the plugin's is refused, naming the mount file", () => {
    const { root } = fresh();
    mountEcho(root);
    succeeds(root, "model", "--json");
    mountEcho(root, { imports: ['import health from "../things/system/verbs/health.ts";'], verbs: ["p.omit(health)"] });
    refuses(root, ["model", "--json"], /omit|not (?:the|this) plugin|isn't (?:the|this) plugin|not one of/i, ["blueprint/features/echo.ts", "system.health"]);
  });
});

describe("08 verbs: narrow", () => {
  it("records the kept ways in on the mount and the operation, and the operation is still served", () => {
    const { root } = fresh();
    mountEcho(root);
    expect(model(root).mounts?.["echo"]?.narrowed ?? {}).toEqual({});
    narrowRepeat(root);
    const got = model(root);
    expect([...(got.mounts?.["echo"]?.narrowed?.["echo.repeat"] ?? [])].sort()).toEqual(["key", "session"]);
    expect([...(got.operations["echo.repeat"]!.via ?? [])].sort()).toEqual(["key", "session"]);
    expect(Object.keys(got.operations)).toContain("echo.shout");
    succeeds(root, "generate");
    expect(existsSync(join(root, "generated/api/src/echo/repeat.ts"))).toBe(true);
    expect(existsSync(join(root, "generated/sdk/src/echo/repeat.ts"))).toBe(true);
    // Without Via.agent, MCP (the one way in M1 can tell apart) has no tool for it; the operation beside it keeps its tool.
    expect(textAt(root, "generated/mcp/src/index.ts")).not.toContain('"echo.repeat"');
    expect(textAt(root, "generated/mcp/src/index.ts")).toContain('"echo.shout"');
  });

  it("is still served over HTTP and the SDK, and the MCP door refuses it", async () => {
    const { root } = fresh();
    narrowRepeat(root);
    succeeds(root, "generate");
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const world = yield* Worlds.start({ root, port: PORTS.narrow, name: "m1-feature-narrow" });
      const served = yield* Effect.promise(() => post(world.url, "/echo/repeat", { text: "hello" }));
      expect(served.status).toBe(200);
      expect(yield* Effect.promise(() => served.json())).toEqual({ text: "hello" });
      const who = { email: "narrow@acme.test", password: "not-a-real-person-password" };
      const signed = yield* Effect.promise(() => fetch(`${world.url}/api/auth/sign-up/email`, { method: "POST",
        headers: { "content-type": "application/json", origin: world.url }, body: JSON.stringify({ ...who, name: "narrow" }) }));
      expect(signed.status).toBe(200);
      const beside = yield* Effect.promise(() => callAs(world.url, who, "echo.shout", { text: "hello" }));
      expect(beside.isError, beside.text).toBe(false);
      const refused = yield* Effect.promise(() => callAs(world.url, who, "echo.repeat", { text: "hello" }).then((called) => called, (error: unknown) => ({ isError: true, text: String(error) })));
      expect(refused.isError, refused.text).toBe(true);
      expect(refused.text).not.toContain('"text":"hello"');
    })));
    nothingRunning(root);
  });

  it("with no ways in left it is refused, naming the mount file: omit is how an operation goes", () => {
    const { root } = fresh();
    narrowRepeat(root);
    succeeds(root, "model", "--json");
    narrowRepeat(root, "[]");
    refuses(root, ["model", "--json"], /via|empty|omit/i, ["blueprint/features/echo.ts", "echo.repeat"]);
  });

  it("narrowing an operation that isn't the plugin's is refused, naming the mount file", () => {
    const { root } = fresh();
    mountEcho(root);
    succeeds(root, "model", "--json");
    mountEcho(root, { via: true, imports: ['import health from "../things/system/verbs/health.ts";'], verbs: ["p.narrow(health, { via: [Via.key] })"] });
    refuses(root, ["model", "--json"], /narrow|not (?:the|this) plugin|isn't (?:the|this) plugin|not one of/i, ["blueprint/features/echo.ts", "system.health"]);
  });
});

describe("08 verbs: choose", () => {
  it("takes the first option of an unpicked choice, and records what was picked", () => {
    const { root } = fresh();
    mountEcho(root, { verbs: [] });
    expect(model(root).mounts?.["echo"]?.chosen).toEqual({ style: "plain" });
    const unpicked = "blueprint/features/echo.ts";
    const body = readFileSync(join(root, unpicked), "utf8").replace("p.choose(p.choices.style.plain)", "");
    expect(body).not.toContain("choose");
    writeFileSync(join(root, unpicked), body);
    expect(model(root).mounts?.["echo"]?.chosen).toEqual({ style: "plain" });
    mountEcho(root, { pick: "loud" });
    expect(model(root).mounts?.["echo"]?.chosen).toEqual({ style: "loud" });
  });

  it("two picks from one choice are refused, naming the mount file", () => {
    const { root } = fresh();
    mountEcho(root);
    succeeds(root, "model", "--json");
    mountEcho(root, { verbs: ["p.choose(p.choices.style.loud)"] });
    refuses(root, ["model", "--json"], /one|two|twice|both|more than|choice|style/i, ["blueprint/features/echo.ts", "style"]);
  });
});
