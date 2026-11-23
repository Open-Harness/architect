// Check 05 (M1.08): the graph of what a mount provides and needs, through produced models, the public Compare and Impact,
// and what `ortho impact` prints. The adapter and `step` parts of Codex's original belong to checks 03 and 04.
//
// Assumptions beyond M1-plugins: `ortho impact` prints its edge lines before its other lines; a missing handler module is
// refused at `generate` (section 8), the package.json and blueprint folder at `model` (section 7), and each names the package.
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Compare, type Model } from "@orthograph/compiler";
import { Impact } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { digest, model, mountEcho, project, removeAt, run, succeeds, textAt, writeMount, type Copy, type Entry } from "./support.ts";

const copies: Array<Copy> = [];
const fresh = (...kinds: Array<Entry>) => { const copy = project(...kinds); copies.push(copy); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const produced = (root: string) => model(root) as unknown as Model;
const deps = (current: Model, operation: string) => Compare.dependsOn(current, operation);
const appOperations = (current: Model) => Object.keys(current.operations).filter((name) => !name.startsWith("echo.") && !name.startsWith("greet."));
const echoed = (options: Parameters<typeof mountEcho>[1] = {}, ...more: Array<Entry>) => {
  const copy = fresh("echo", ...more);
  mountEcho(copy.root, options);
  return copy;
};
// A retained ledger from the actual compiled hashes exercises staleness only; it claims no eval passed.
const retain = (root: string, current: Model) => {
  mkdirSync(join(root, ".ortho/evidence"), { recursive: true });
  writeFileSync(join(root, ".ortho/evidence/proven.json"), JSON.stringify({ model: current,
    proven: Object.fromEntries(Object.keys(current.operations).map((name) => [name, deps(current, name)])) }));
};
const changed = (before: Model, after: Model, operation: string) =>
  Object.entries(deps(before, operation)).some(([key, hash]) => Compare.hashOf(after, key) !== hash);
/** Only the echo mount's operations are stale; every operation that came from the app keeps its proof. */
const staleOnlyEcho = async (root: string, before: Model, after: Model) => {
  for (const name of ["echo.repeat", "echo.shout"]) expect(changed(before, after, name), name).toBe(true);
  for (const name of appOperations(after)) expect(changed(before, after, name), name).toBe(false);
  const impact = await Effect.runPromise(Impact.of(root, after));
  expect([...impact.stale].sort()).toEqual(["echo.repeat", "echo.shout"]);
  expect(impact.proven).toEqual(expect.arrayContaining(appOperations(after)));
};
const failsNaming = (root: string, args: ReadonlyArray<string>, names: ReadonlyArray<string>) => {
  const result = run(root, ...args);
  expect(result.status, result.out).not.toBe(0);
  for (const name of names) expect(result.out).toContain(name);
};

describe("05 graph: edges and keys", () => {
  it("prints sorted, deduplicated edges first: provides, and needs between mounts", () => {
    const { root } = echoed({}, "greet");
    writeMount(root, "feature", "greet", { pkg: "@fixture/greet" });
    const output = succeeds(root, "impact").stdout;
    const lines = output.trimEnd().split("\n");
    const edges = lines.filter((line) => line.includes(" -> "));
    for (const edge of [/^feature:echo -> echo\.repeat\s+provides$/, /^feature:echo -> echo\.shout\s+provides$/, /^feature:greet -> greet\.hello\s+provides$/, /^feature:greet -> feature:echo\s+needs$/]) {
      expect(edges.filter((line) => edge.test(line)), `${edge}\n${output}`).toHaveLength(1);
    }
    expect(edges).toEqual([...new Set(edges)].sort());
    expect(lines.slice(0, edges.length)).toEqual(edges);
    expect(lines.slice(edges.length).some((line) => line.includes(" -> "))).toBe(false);
    expect(lines.slice(edges.length)).toContain("stale none");
  });

  it("Compare names the mount as what its operations depend on, and hashOf answers it", () => {
    const { root } = echoed();
    const current = produced(root);
    const mounts = model(root).mounts;
    const dependencies = deps(current, "echo.repeat");
    expect(dependencies["feature:echo"]).toBeTypeOf("string");
    for (const [key, hash] of Object.entries(dependencies)) expect(Compare.hashOf(current, key), key).toBe(hash);
    expect(deps(current, "echo.shout")["feature:echo"]).toBe(dependencies["feature:echo"]);
    expect(mounts?.["echo"]?.hash).toBe(dependencies["feature:echo"]);
    // Nothing of the app depends on the mount.
    for (const name of appOperations(current)) expect(Object.keys(deps(current, name)).some((key) => key.startsWith("feature:")), name).toBe(false);
    // Nothing that is a function or an Effect layer leaks into what is hashed.
    expect(JSON.stringify(current)).not.toMatch(/\[object Function\]|\[object Object\]|"_op"\s*:/);
  });
});

describe("05 graph: what stales what", () => {
  it("a changed pick stales the mount's operations and nothing else", async () => {
    const { root } = echoed();
    const before = produced(root);
    retain(root, before);
    mountEcho(root, { pick: "loud" });
    await staleOnlyEcho(root, before, produced(root));
  });

  it("changed bytes in the installed package stale them too, though the version is the same", async () => {
    const { root, installed } = echoed();
    const before = produced(root);
    const mountBefore = model(root).mounts?.["echo"];
    retain(root, before);
    appendFileSync(join(installed["echo"]!.installed, "dist/src/echo/repeat.js"), '\nexport const authoredIntegrityRevision = "second";\n');
    expect(JSON.parse(textAt(root, "node_modules/@fixture/echo/package.json")).version).toBe("1.0.0");
    const after = produced(root);
    const mountAfter = model(root).mounts?.["echo"];
    expect(mountAfter?.version).toBe(mountBefore?.version);
    expect(mountAfter?.integrity).not.toBe(mountBefore?.integrity);
    await staleOnlyEcho(root, before, after);
  });

  it("a changed byte in a declaration the app never imports by name stales them as well", async () => {
    const { root, installed } = echoed();
    const before = produced(root);
    retain(root, before);
    appendFileSync(join(installed["echo"]!.installed, "dist/blueprint/journeys/echo.js"), "\n// a second revision of the plugin's own journey\n");
    await staleOnlyEcho(root, before, produced(root));
  });

  it("transient outputs and the checkout path enter no hash", () => {
    const first = echoed();
    const second = echoed();
    expect(first.root).not.toBe(second.root);
    const before = produced(first.root);
    mkdirSync(join(first.root, ".ortho/temporary-run"), { recursive: true });
    writeFileSync(join(first.root, ".ortho/temporary-run/random.txt"), "a transient run output");
    succeeds(first.root, "generate");
    const after = produced(first.root);
    const other = produced(second.root);
    const mountBefore = model(first.root).mounts?.["echo"];
    const mountOther = model(second.root).mounts?.["echo"];
    for (const name of Object.keys(before.operations)) {
      expect(deps(after, name), name).toEqual(deps(before, name));
      expect(deps(other, name), name).toEqual(deps(before, name));
    }
    expect(mountOther?.integrity).toBe(mountBefore?.integrity);
    expect(mountOther?.hash).toBe(mountBefore?.hash);
  });
});

describe("05 graph: fails closed, naming the package", () => {
  it("a missing handler module is refused", () => {
    const { root } = echoed();
    succeeds(root, "generate");
    removeAt(root, "node_modules/@fixture/echo/dist/src/echo/repeat.js");
    failsNaming(root, ["generate"], ["@fixture/echo", "echo.repeat"]);
  });

  it("a missing blueprint folder is refused", () => {
    const { root } = echoed();
    produced(root);
    removeAt(root, "node_modules/@fixture/echo/dist/blueprint");
    failsNaming(root, ["model", "--json"], ["@fixture/echo"]);
  });

  it("a missing package.json is refused", () => {
    const { root } = echoed();
    produced(root);
    removeAt(root, "node_modules/@fixture/echo/package.json");
    failsNaming(root, ["model", "--json"], ["@fixture/echo"]);
  });
});

describe("05 graph: order does not matter", () => {
  it("the same things declared in another order keep their names, identifiers, codes and tags", () => {
    const identity = (current: Model) => ({
      things: Object.fromEntries(Object.entries(current.things).map(([key, value]) => [key, { name: value.name, identifier: value.identifier, code: value.code }])),
      operations: Object.fromEntries(Object.entries(current.operations).map(([key, value]) => [key, { name: value.name, thing: value.thing, identifier: value.identifier, verb: value.verb }])),
      refusals: Object.keys(current.refusals).sort(),
    });
    const forward = fresh({ kind: "echo", variant: "order-forward" });
    const reverse = fresh({ kind: "echo", variant: "order-reverse" });
    mountEcho(forward.root);
    mountEcho(reverse.root);
    const a = identity(produced(forward.root));
    const b = identity(produced(reverse.root));
    expect(b).toEqual(a);
    // Refusal codes follow declaration order (never silently renumbered): the prefix is shared, the numbers are not.
    const codes = (root: string) => produced(root).refusals as Record<string, string>;
    const f = codes(forward.root);
    const r = codes(reverse.root);
    expect(f["EchoProblem"]).toMatch(/^EC-\d+$/);
    expect(f["EchoOther"]).toMatch(/^EC-\d+$/);
    expect(r["EchoProblem"]).toMatch(/^EC-\d+$/);
    expect(r["EchoOther"]).toMatch(/^EC-\d+$/);
    expect(f["EchoProblem"]).toBe("EC-001");
    expect(f["EchoOther"]).toBe("EC-002");
    expect(r["EchoOther"]).toBe("EC-001");
    expect(r["EchoProblem"]).toBe("EC-002");
  });
});
