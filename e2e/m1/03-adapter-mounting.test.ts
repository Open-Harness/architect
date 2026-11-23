// Check 03 (M1.14): an adapter is its own package, mounted like the other plugins, and an app operation reaches it as a
// step. These stay red until M1.14: the compiler reads no adapter mount before then. Everything here is judged on files,
// the model, `ortho impact`, and the real import closure; what the call does at run time is check 04.
//
// Assumptions beyond M1-plugins section 9 are listed at the top of adapters.ts and in README.md: the scaffold of the
// operation wires the callable and leaves one `Handlers.blank`; the mount default-exports `calls`.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Compare, type Model } from "@orthograph/compiler";
import { afterEach, describe, expect, it } from "vitest";
import { PACKAGE, PRICING, mountPricing, writeProbe } from "./adapters.ts";
import { bundle, filesOf, typecheckSdk, violations } from "./closures.ts";
import { model, project, refuses, run, succeeds, textAt, tree, type Copy, type Entry } from "./support.ts";

const copies: Array<Copy> = [];
const fresh = (...kinds: Array<Entry>) => { const copy = project(...kinds); copies.push(copy); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

describe("03 adapters: ortho add adapter", () => {
  it("a dry run writes nothing; one command writes one mount and pins it; a duplicate and the wrong kind are refused", () => {
    const { root } = fresh({ kind: "remote", pin: "range" }, "echo");
    const manifest = textAt(root, "package.json");
    const dry = succeeds(root, "add", "adapter", "@fixture/remote", "--as", "pricing", "--dry-run");
    expect(dry.out).toMatch(/would write blueprint\/adapters\/pricing\.ts/);
    expect(existsSync(join(root, "blueprint/adapters"))).toBe(false);
    expect(textAt(root, "package.json")).toBe(manifest);

    const added = succeeds(root, "add", "adapter", "@fixture/remote", "--as", "pricing");
    expect(added.stdout.trimEnd().split("\n")).toEqual([expect.stringMatching(/^wrote blueprint\/adapters\/pricing\.ts$/), expect.stringMatching(/^pinned @fixture\/remote 1\.0\.0 /), "needs none", "next ortho generate, then ortho check"]);
    expect(tree(root, "blueprint/adapters")).toEqual([PRICING]);
    const file = textAt(root, PRICING);
    expect(file.split("\n")[0]).toMatch(/Scaffolded from @fixture\/remote 1\.0\.0\. Yours from now on\.$/);
    expect(file).toContain("Blueprint.use(");
    expect(file).toContain('from "@fixture/remote"');
    expect((JSON.parse(textAt(root, "package.json")) as { dependencies: Record<string, string> }).dependencies["@fixture/remote"]).toBe("1.0.0");

    refuses(root, ["add", "adapter", "@fixture/remote", "--as", "pricing"], /already exists/, [PRICING]);
    expect(textAt(root, PRICING)).toBe(file);
    refuses(root, ["add", "feature", "@fixture/remote"], /adapter|kind/i, ["@fixture/remote"]);
    refuses(root, ["add", "adapter", "@fixture/echo"], /feature|kind/i, ["@fixture/echo"]);
    expect(tree(root, "blueprint/adapters")).toEqual([PRICING]);
  });

  it("after it, generate and check work with nothing else", () => {
    const { root } = fresh({ kind: "remote", pin: "range" });
    succeeds(root, "add", "adapter", "@fixture/remote", "--as", "pricing");
    succeeds(root, "generate");
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(0);
    expect(model(root).mounts?.["pricing"]).toMatchObject({ kind: "adapter", package: "@fixture/remote", version: "1.0.0" });
  });
});

describe("03 adapters: a mount reaches only what it includes", () => {
  it("records the mount, and an app operation's step.call compiles against an included call", () => {
    const { root } = fresh("remote");
    mountPricing(root);
    writeProbe(root, PACKAGE.promise, "promise");
    const got = model(root);
    expect(got.mounts?.["pricing"]).toMatchObject({ kind: "adapter", file: PRICING, package: "@fixture/remote", version: "1.0.0" });
    expect(got.mounts?.["pricing"]?.integrity).toMatch(/^sha256-/);
    expect(Object.keys(got.operations)).toContain("probe.quote");
    expect(got.operations["probe.quote"]!.from).toEqual({ kind: "app" });
  });

  it("an operation naming a call its mount did not include is refused, naming the mount and the call", () => {
    const { root } = fresh("remote");
    mountPricing(root);
    writeProbe(root, PACKAGE.promise, "promise");
    succeeds(root, "model", "--json");
    mountPricing(root, PACKAGE.promise, false);
    refuses(root, ["model", "--json"], /include|reach|not (?:included|named)/i, [PRICING, "quote"]);
  });

  it("including a call the adapter does not have is refused, naming the mount file", () => {
    const { root } = fresh("remote");
    mountPricing(root);
    succeeds(root, "model", "--json");
    writeFileSync(join(root, PRICING), textAt(root, PRICING).replace("p.calls.quote", "p.calls.notExported"));
    refuses(root, ["model", "--json"], /notExported|include|call/i, [PRICING, "notExported"]);
  });
});

describe("03 adapters: the graph", () => {
  it("prints a used-by edge from the mount to the operation that calls it, and Compare keys on it", () => {
    const { root } = fresh("remote");
    mountPricing(root);
    writeProbe(root, PACKAGE.promise, "promise");
    const current = model(root) as unknown as Model;
    const key = "adapter:pricing";
    expect(Compare.dependsOn(current, "probe.quote")[key]).toBeTypeOf("string");
    expect(Compare.hashOf(current, key)).toBe(Compare.dependsOn(current, "probe.quote")[key]);
    expect(Object.keys(Compare.dependsOn(current, "system.health"))).not.toContain(key);
    const edges = succeeds(root, "impact").stdout.split("\n").filter((line) => line.includes(" -> "));
    expect(edges.filter((line) => /^adapter:pricing -> probe\.quote\s+used-by$/.test(line))).toHaveLength(1);
    expect(edges).toEqual([...new Set(edges)].sort());
  });
});

describe("03 adapters: foreign code stays out of every pure entry and client closure", () => {
  it("a scaffold with one blank, and nothing foreign in blueprint/ or the api and sdk", () => {
    const { root } = fresh("remote");
    mountPricing(root);
    writeProbe(root, PACKAGE.promise, "promise");
    succeeds(root, "generate");
    const scaffold = textAt(root, "src/probe/quote.ts");
    expect(scaffold.match(/Handlers\.blank\(/g)).toHaveLength(1);
    for (const path of [...tree(root, "blueprint"), ...tree(root, "generated/api"), ...tree(root, "generated/sdk")]) {
      expect(textAt(root, path), path).not.toMatch(/@fixture\/remote\/src\/|\/src\/calls\//);
    }
    const sdk = bundle(root, "generated/sdk/src/index.ts", "adapter-sdk");
    const api = bundle(root, "generated/api/src/index.ts", "adapter-api");
    expect(filesOf(root, api, "@fixture/remote").some((file) => file.startsWith("dist/blueprint/"))).toBe(true);
    expect(violations(root, api, "client", "@fixture/remote")).toEqual([]);
    expect(violations(root, sdk, "client", "@fixture/remote")).toEqual([]);
  });

  it("a Node-capable Promise callable's own types and runtime stay out of the SDK and API", () => {
    const { root } = fresh("node-remote");
    mountPricing(root, "@fixture/node-remote");
    writeProbe(root, "@fixture/node-remote", "promise");
    succeeds(root, "generate");
    typecheckSdk(root, { access: "probe.quote", payload: '{ origin: "x", mode: "ok" }', wrong: '{ origin: 1, mode: "ok" }' }, [/@fixture\/node-remote\/dist\/src\//]);
    expect(violations(root, bundle(root, "generated/api/src/index.ts", "node-api"), "client", "@fixture/node-remote")).toEqual([]);
    expect(violations(root, bundle(root, "generated/sdk/src/index.ts", "node-sdk"), "client", "@fixture/node-remote")).toEqual([]);
  });
});
