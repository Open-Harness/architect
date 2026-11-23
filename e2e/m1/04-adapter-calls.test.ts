// Check 04 (M1.14): what an adapter's call does, through the operation that calls it, over HTTP in a real workerd world,
// against a real HTTP service that holds and releases requests (D4 section 3, kept by M1-plugins section 9).
//
// The first test is a control and passes now: it proves the instrument, a planted runner that releases counted work too
// early, is caught by the held-request observation. The rest stay red until M1.14.
//
// Assumptions beyond M1-plugins (adapters.ts and README.md): the scaffold of `probe.quote` wires the callable by the
// payload's field names and leaves one `Handlers.blank` for the error mapping; a declared refusal is HTTP 422 with its
// name as `_tag` (as acme's are), a defect is a 5xx; a client that goes away while a Promise call is held does not make
// the Worker drop the raw wait (the service sees no early close).
import { spawn } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Worlds } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { logOf, readyAdapter, withHold, type Flavor, type Mapper } from "./adapters.ts";
import { PORTS, fixtures, nothingRunning, project, type Copy } from "./support.ts";

const copies: Array<Copy> = [];
const fresh = (flavor: Flavor | "plain" = "plain", mapper: Mapper = "normal") => {
  const copy = project(flavor === "effect" ? "effect-remote" : "remote");
  copies.push(copy);
  if (flavor !== "plain") readyAdapter(copy.root, flavor, mapper);
  return copy;
};
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const call = (url: string, body: unknown, signal?: AbortSignal) => fetch(`${url}/probe/quote`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), ...(signal ? { signal } : {}) });
const answered = async (url: string, body: unknown) => {
  const response = await call(url, body);
  const text = await response.text();
  return { status: response.status, text, tag: (JSON.parse(text.startsWith("{") ? text : "{}") as { _tag?: string })._tag };
};
const inWorld = <A>(root: string, port: number, name: string, use: (url: string, log: string) => Effect.Effect<A>) =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const world = yield* Worlds.start({ root, port, name });
    return yield* use(world.url, world.log);
  })));

describe("04 control: the instrument", () => {
  it("a runner that releases counted work before the held request settles is rejected by the held-request observation", async () => {
    const { root } = fresh();
    const dir = join(root, ".ortho/adapter-proof");
    mkdirSync(dir, { recursive: true });
    for (const name of ["missing-mask.ts", "missing-mask-main.ts"]) cpSync(join(fixtures, "adapter-cases", name), join(dir, name));
    await withHold(async ({ origin }) => {
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn(process.execPath, [join(dir, "missing-mask-main.ts"), origin], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
        let text = "";
        child.stdout.on("data", (chunk: Buffer) => { text += chunk.toString(); });
        child.stderr.on("data", (chunk: Buffer) => { text += chunk.toString(); });
        child.once("error", reject);
        child.once("close", (code) => (code === 0 ? resolve(text) : reject(new Error(`exited ${code}: ${text}`))));
      });
      const line = output.split("\n").find((l) => l.startsWith("ADAPTER_RESULT "))!;
      expect(JSON.parse(line.slice("ADAPTER_RESULT ".length))).toEqual({ missingMaskRejected: true });
    });
  });
});

describe("04 Promise mode: a plain Promise callable, called lazily, mapped once", () => {
  it("success answers; a rejection and a synchronous throw reach the one mapping and become the declared refusal; nothing foreign leaks", async () => {
    const { root } = fresh("promise");
    await withHold(async ({ origin }) => {
      const got = await inWorld(root, PORTS.promise, "m1-adapter-promise", (url, log) => Effect.promise(async () => {
        const results = { ok: await answered(url, { origin, mode: "ok" }), reject: await answered(url, { origin, mode: "reject" }), throw: await answered(url, { origin, mode: "throw" }) };
        return { results, log: logOf(log) };
      }));
      expect(got.results.ok).toMatchObject({ status: 200 });
      expect(JSON.parse(got.results.ok.text)).toEqual({ value: "ok" });
      for (const mode of ["reject", "throw"] as const) {
        expect(got.results[mode].status, mode).toBe(422);
        expect(got.results[mode].tag, mode).toBe("PriceUnavailable");
        expect(got.results[mode].text, mode).not.toContain("foreign-private-canary");
      }
      expect(got.log).not.toContain("foreign-private-canary");
    });
    nothingRunning(root);
  });

  it("the raw wait is counted work that outlives a client which goes away: the service sees no early close until it answers", async () => {
    const { root } = fresh("promise");
    await withHold(async ({ origin, state }) => {
      await inWorld(root, PORTS.promise, "m1-adapter-hold", (url) => Effect.promise(async () => {
        const gone = new AbortController();
        const pending = call(url, { origin, mode: "hold" }, gone.signal).then(() => undefined, () => undefined);
        await fetch(`${origin}/wait-held`, { headers: { connection: "close" } }).then((r) => r.text());
        gone.abort();
        await pending;
        // Many round trips to the service while the request is held and its caller is gone: it is never dropped.
        for (let i = 0; i < 25; i += 1) expect(await state()).toEqual({ held: 1, aborted: 0 });
        await fetch(`${origin}/release`, { headers: { connection: "close" } }).then((r) => r.text());
        expect((await state()).aborted).toBe(0);
      }));
    });
    nothingRunning(root);
  });
});

describe("04 Effect mode: the callable's typed failure and its services are kept; only the typed failure is mapped", () => {
  it("success carries the adapter layer's setting; a typed failure becomes the declared refusal; a defect and an interruption are not mapped", async () => {
    const { root } = fresh("effect");
    const results = await inWorld(root, PORTS.effect, "m1-adapter-effect", (url, log) => Effect.promise(async () => ({
      ok: await answered(url, { mode: "ok" }), fail: await answered(url, { mode: "fail" }),
      defect: await answered(url, { mode: "defect" }), interrupt: await answered(url, { mode: "interrupt" }), log: logOf(log) })));
    expect(results.ok.status).toBe(200);
    expect(JSON.parse(results.ok.text)).toEqual({ value: "configured-setting" });
    expect(results.fail).toMatchObject({ status: 422, tag: "PriceUnavailable" });
    expect(results.fail.text).not.toContain("foreign-private-canary");
    expect(results.defect.status).toBeGreaterThanOrEqual(500);
    expect(results.defect.tag).not.toBe("PriceUnavailable");
    expect(results.interrupt.status).not.toBe(200);
    expect(results.interrupt.tag).not.toBe("PriceUnavailable");
    expect(results.log).not.toContain("foreign-private-canary");
    nothingRunning(root);
  });
});

describe("04 the one blank: an unmapped or mismapped failure is a defect, never a refusal made up", () => {
  for (const mapper of ["defect", "unselected"] as const) {
    it(`${mapper === "defect" ? "a defect" : "an unselected"} mapper makes the rejected call a defect, not a PriceUnavailable`, async () => {
      const { root } = fresh("promise", mapper);
      await withHold(async ({ origin }) => {
        const got = await inWorld(root, PORTS.mapper, `m1-adapter-${mapper}`, (url) => Effect.promise(() => answered(url, { origin, mode: "reject" })));
        expect(got.status).toBeGreaterThanOrEqual(500);
        expect(got.tag).not.toBe("PriceUnavailable");
        expect(got.tag).not.toBe("UnselectedRefusal");
      });
      nothingRunning(root);
    });
  }
});
