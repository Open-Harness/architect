// Check 00 (M1.02): positive controls. These pass on main, before any plugin code exists, and keep passing after it:
// they prove the fixtures are real, installable packages, and that a project which mounts nothing is untouched by them.
//
// Assumptions this file makes about M1-plugins (see README.md): the fixture's root export is `dist/feature.js` (adapters:
// `dist/adapter.js`); `src/calls/<call>.js` holds an adapter's callable as its default export.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { coverageLine } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { PORTS, digest, model, projectionMounts, nothingRunning, project, run, succeeds, tree, type Copy, type Entry } from "./support.ts";

const copies: Array<Copy> = [];
const fresh = (...kinds: Array<Entry>) => { const copy = project(...kinds); copies.push(copy); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const json = (root: string, path: string) => JSON.parse(readFileSync(join(root, path), "utf8")) as Record<string, unknown>;

describe("00 controls: the fixture plugins are real packages", () => {
  it("echo is built, packed and installed with the layout of M1-plugins section 1", () => {
    const { root, installed } = fresh("echo");
    const at = installed["echo"]!.installed;
    expect(at).toBe(join(root, "node_modules/@fixture/echo"));
    for (const path of ["package.json", "dist/feature.js", "dist/feature.d.ts", "dist/blueprint/choices.js", "dist/blueprint/choices.d.ts",
      "dist/blueprint/things/echo/thing.js", "dist/blueprint/things/echo/errors.js", "dist/blueprint/things/echo/verbs/repeat.js",
      "dist/blueprint/things/echo/verbs/shout.js", "dist/blueprint/journeys/echo.js", "dist/src/echo/repeat.js", "dist/src/echo/shout.js",
      "dist/src/echo/repeat.node.js", "dist/src/echo/repeat.browser.js"]) {
      expect(existsSync(join(at, path)), `${path} is in the installed package`).toBe(true);
      expect(statSync(join(at, path)).size, path).toBeGreaterThan(0);
    }
    const manifest = json(root, "node_modules/@fixture/echo/package.json");
    expect(manifest["name"]).toBe("@fixture/echo");
    expect(manifest["version"]).toBe("1.0.0");
    expect(manifest["orthograph"]).toEqual({ kind: "feature", blueprint: "./dist/blueprint", src: "./dist/src" });
    expect(Object.keys(manifest["exports"] as object)).toEqual([".", "./blueprint/*", "./src/*"]);
    expect((manifest["exports"] as Record<string, { default: string }>)["."]!.default).toBe("./dist/feature.js");
    // Pinned exactly: no range anywhere in what the package asks of its host.
    for (const version of Object.values(manifest["peerDependencies"] as Record<string, string>)) expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    // The archive holds dist and the manifest, and none of the sources it was built from.
    expect(installed["echo"]!.packed.every((path) => path === "package.json" || path.startsWith("dist/"))).toBe(true);
    expect(installed["echo"]!.packed.some((path) => path.startsWith("source/"))).toBe(false);
  });

  it("the project's package.json carries the dependency, and the package is the one that was packed", () => {
    const { root } = fresh("echo");
    expect((json(root, "package.json")["dependencies"] as Record<string, string>)["@fixture/echo"]).toBe("1.0.0");
    const again = fresh({ kind: "echo", pin: "range" });
    expect((json(again.root, "package.json")["dependencies"] as Record<string, string>)["@fixture/echo"]).toBe("^1.0.0");
  });

  it("the pure entries import no runtime entry, and the handlers import no declaration they should not", () => {
    const { installed } = fresh("echo");
    const at = installed["echo"]!.installed;
    for (const pure of ["dist/feature.js", "dist/blueprint/choices.js", "dist/blueprint/things/echo/thing.js", "dist/blueprint/things/echo/verbs/repeat.js"]) {
      expect(readFileSync(join(at, pure), "utf8"), pure).not.toMatch(/from ["'][^"']*(?:\/src\/|\.node\.js|\.browser\.js|node:)/);
    }
    expect(readFileSync(join(at, "dist/src/echo/repeat.node.js"), "utf8")).toContain("node:crypto");
    expect(readFileSync(join(at, "dist/src/echo/repeat.js"), "utf8")).not.toContain("node:");
  });

  it("greet, the plain library and the three adapters install too, each of the kind it says", () => {
    const { root } = fresh("echo", "greet", "plain", "remote", "effect-remote", "node-remote");
    const kinds = Object.fromEntries(["greet", "plain", "remote", "effect-remote", "node-remote"].map((kind) =>
      [kind, json(root, `node_modules/@fixture/${kind}/package.json`)["orthograph"]]));
    expect(kinds["greet"]).toMatchObject({ kind: "feature" });
    expect(kinds["plain"]).toBeUndefined();
    for (const adapter of ["remote", "effect-remote", "node-remote"]) {
      expect(kinds[adapter]).toEqual({ kind: "adapter", blueprint: "./dist/blueprint", src: "./dist/src" });
      expect(existsSync(join(root, `node_modules/@fixture/${adapter}/dist/adapter.js`))).toBe(true);
      expect(existsSync(join(root, `node_modules/@fixture/${adapter}/dist/src/calls/quote.js`))).toBe(true);
      expect(existsSync(join(root, `node_modules/@fixture/${adapter}/dist/blueprint/things/pricing/errors.js`))).toBe(true);
    }
    expect(existsSync(join(root, "node_modules/@fixture/effect-remote/dist/src/layer.js"))).toBe(true);
    expect(readFileSync(join(root, "node_modules/@fixture/node-remote/dist/src/calls/quote.js"), "utf8")).toContain("node:sqlite");
  });

  it("a variant is a real package too: an empty handler and a missing handler module are built, not hand-edited", () => {
    const empty = fresh({ kind: "echo", variant: "empty-handler" });
    expect(readFileSync(join(empty.root, "node_modules/@fixture/echo/dist/src/echo/repeat.js"), "utf8")).toContain("echo.repeat");
    const none = fresh({ kind: "echo", variant: "no-handler" });
    expect(existsSync(join(none.root, "node_modules/@fixture/echo/dist/src/echo/shout.js"))).toBe(false);
    expect(existsSync(join(none.root, "node_modules/@fixture/echo/dist/src/echo/repeat.js"))).toBe(true);
  });
});

describe("00 controls: a project that mounts nothing is untouched by an installed plugin", () => {
  it("keeps its model and its generated/ byte for byte, and `ortho check` still passes", () => {
    const bare = fresh();
    const withFixtures = fresh("echo", "greet", "remote");
    const before = succeeds(bare.root, "model", "--json").stdout;
    expect(succeeds(withFixtures.root, "model", "--json").stdout).toBe(before);
    // acme mounts no feature or adapter of its own; its only mounts are projections of @orthograph/projections (checks 12 and 14).
    const mounts = model(withFixtures.root).mounts ?? {};
    expect(projectionMounts(mounts).length).toBeGreaterThan(0);
    expect(Object.values(mounts).filter((mount) => mount.kind !== "projection")).toEqual([]);
    expect(Object.keys(mounts).sort()).toEqual(projectionMounts(mounts));
    const generated = digest(bare.root, "generated");
    expect(Object.keys(generated).length).toBeGreaterThan(40);
    succeeds(withFixtures.root, "generate");
    expect(digest(withFixtures.root, "generated")).toEqual(generated);
    expect(tree(withFixtures.root, "blueprint").some((path) => /blueprint\/(features|adapters)\//.test(path))).toBe(false);
    const checked = run(withFixtures.root, "check");
    expect(checked.status, checked.out).toBe(0);
  });

  it("proves with every operation's nine evals and coverage as without it", () => {
    const { root } = fresh("echo");
    const proved = run(root, "prove", "--env", "local", "--port", String(PORTS.control));
    expect(proved.status, proved.out).toBe(0);
    const lines = proved.stdout.trimEnd().split("\n");
    expect(lines.filter((l) => /^journey .* ✔ \d+\/\d+ steps$/.test(l))).toHaveLength(15);
    expect(lines.filter((l) => / 9 evals ✔ /.test(l))).toHaveLength(15);
    expect(lines.some((l) => l.includes("echo"))).toBe(false);
    expect(lines).toContain(coverageLine("moves 7/7 · outcomes 7/7 · refusals 4/4 · runtime refusals 15/17", JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8"))));
    expect(lines.at(-1)).toBe("prove ✔");
    nothingRunning(root);
  });
});
