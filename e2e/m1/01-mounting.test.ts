// Check 01 (M1.06 and M1.10): a feature mounted by hand, and mounted through one `ortho add feature`.
//
// Assumptions beyond M1-plugins (README.md lists them all): `mounts.<name>` carries `kind`, `file`, `package`, `version`,
// `integrity` (starting `sha256-`), `chosen` and `hash` (section 7); a thing's and an operation's `from` is as section 7
// shows it; the scaffold's first line names the package and version (section 3's snippet); `add` prints the three lines of
// section 11 in that order.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { projectionMounts, addFeature, digest, model, mountEcho, mountFile, project, refuses, run, succeeds, textAt, tree, type Copy, type Entry, type MountJson } from "./support.ts";

const copies: Array<Copy> = [];
const fresh = (...kinds: Array<Entry>) => { const copy = project(...kinds); copies.push(copy); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

// acme mounts projections itself (checks 12 and 14), any subset of what @orthograph/projections ships, so "the mounts" of a
// plugin test are the others: every mount that is not a projection, by name.
const own = (mounts: Record<string, MountJson> | undefined) => {
  const all = Object.entries(mounts ?? {});
  projectionMounts(mounts);
  return all.filter(([, mount]) => mount.kind !== "projection").map(([name]) => name).sort();
};

const generatedText = (root: string) => tree(root, "generated").map((path) => textAt(root, path)).join("\n");

describe("01 mounting: a feature mounted by hand (M1.06)", () => {
  it("folds the plugin's things and operations into the model, named by their paths, with provenance", () => {
    const { root } = fresh("echo");
    const before = model(root);
    mountEcho(root);
    const got = model(root);
    expect(got.things["echo"]).toMatchObject({ name: "echo", identifier: "Echo", code: "EC" });
    expect(got.operations["echo.repeat"]).toMatchObject({ name: "echo.repeat", thing: "echo", verb: "repeat" });
    expect(got.operations["echo.shout"]).toMatchObject({ name: "echo.shout", thing: "echo", verb: "shout" });
    // The operation's file is the specifier of its pure declaration, which every loader resolves from the project.
    expect(got.operations["echo.repeat"]!.file).toBe("@fixture/echo/blueprint/things/echo/verbs/repeat.js");
    const from = { kind: "feature", mount: "echo", package: "@fixture/echo", version: "1.0.0", thing: "echo" };
    expect(got.things["echo"]!.from).toEqual(from);
    expect(got.operations["echo.repeat"]!.from).toEqual(from);
    expect(got.operations["echo.shout"]!.from).toEqual(from);
    expect(got.refusals["EchoProblem"]).toMatch(/^EC-\d{3}$/);
    // Mounting leaves the app's own declarations, origins and paths intact.
    for (const [name, thing] of Object.entries(before.things)) {
      expect(got.things[name]).toEqual(thing);
      expect(thing.from).toEqual({ kind: "app" });
    }
    for (const [name, operation] of Object.entries(before.operations)) {
      expect(got.operations[name]).toEqual(operation);
      expect(operation.from).toEqual({ kind: "app" });
      expect(operation.file.startsWith("blueprint/things/")).toBe(true);
    }
    expect(Object.keys(got.operations).sort()).toEqual([...Object.keys(before.operations), "echo.repeat", "echo.shout"].sort());
  });

  it("records the mount, section 7: kind, file, package, version, integrity, choices and hash", () => {
    const { root } = fresh("echo");
    mountEcho(root);
    const mount = model(root).mounts?.["echo"];
    expect(mount).toMatchObject({ kind: "feature", file: "blueprint/features/echo.ts", package: "@fixture/echo", version: "1.0.0", chosen: { style: "plain" } });
    expect(mount?.integrity).toMatch(/^sha256-/);
    expect(mount?.hash).toMatch(/\S/);
    expect(own(model(root).mounts)).toEqual(["echo"]);
  });

  it("generates the plugin's operations as an app's own, and writes nothing into src/", () => {
    const { root } = fresh("echo");
    const source = tree(root, "src");
    mountEcho(root);
    succeeds(root, "generate");
    for (const path of ["generated/api/src/echo/repeat.ts", "generated/api/src/echo/shout.ts", "generated/sdk/src/echo/repeat.ts", "generated/sdk/src/echo/shout.ts", "generated/sdk/src/echo/index.ts"]) {
      expect(existsSync(join(root, path)), path).toBe(true);
    }
    expect(tree(root, "src")).toEqual(source);
    expect(existsSync(join(root, "src/echo"))).toBe(false);
    // The server imports the plugin's handler from its package, and every file imports its declaration from there.
    const everything = generatedText(root);
    expect(everything).toContain("@fixture/echo/src/echo/repeat.js");
    expect(everything).toContain("@fixture/echo/blueprint/things/echo/verbs/repeat.js");
    expect(textAt(root, "generated/sdk/src/index.ts")).toContain("echo");
    expect(textAt(root, "generated/mcp/src/index.ts")).toContain('"echo.repeat"');
    expect(textAt(root, "generated/model/model.json")).toContain('"echo.repeat"');
  });

  it("renamed, the mount prefixes each thing: fixture-echo, FixtureEcho, fixture-echo.repeat", () => {
    const { root } = fresh("echo");
    mountEcho(root, { name: "fixture" });
    const got = model(root);
    expect(Object.keys(got.things)).toContain("fixture-echo");
    expect(Object.keys(got.things)).not.toContain("echo");
    expect(got.things["fixture-echo"]).toMatchObject({ name: "fixture-echo", identifier: "FixtureEcho", code: "EC" });
    expect(got.operations["fixture-echo.repeat"]).toMatchObject({ name: "fixture-echo.repeat", thing: "fixture-echo", verb: "repeat" });
    const from = { kind: "feature", mount: "fixture", package: "@fixture/echo", version: "1.0.0", thing: "echo" };
    expect(got.things["fixture-echo"]!.from).toEqual(from);
    expect(got.operations["fixture-echo.repeat"]!.from).toEqual(from);
    expect(own(got.mounts)).toEqual(["fixture"]);
    succeeds(root, "generate");
    for (const path of ["generated/api/src/fixture-echo/repeat.ts", "generated/sdk/src/fixture-echo/repeat.ts", "generated/sdk/src/fixture-echo/index.ts"]) {
      expect(existsSync(join(root, path)), path).toBe(true);
    }
    expect(existsSync(join(root, "generated/api/src/echo"))).toBe(false);
    expect(textAt(root, "generated/sdk/src/index.ts")).toContain("fixtureEcho");
    expect(textAt(root, "generated/api/src/fixture-echo/repeat.ts")).toContain('"/fixture-echo/repeat"');
    expect(textAt(root, "generated/mcp/src/index.ts")).toContain('"fixture-echo.repeat"');
    // The plugin's own name for the thing is not written as a string by the app: the mount only imports the package.
    expect(textAt(root, mountFile("feature", "fixture"))).not.toMatch(/fixture-echo|FixtureEcho/);
  });

  it("an invalid choice fails naming the mount file, and generates nothing", () => {
    const { root } = fresh("echo");
    mountEcho(root);
    succeeds(root, "model", "--json");
    succeeds(root, "generate");
    const generated = digest(root, "generated");
    writeFileSync(join(root, mountFile("feature", "echo")), [
      'import { Blueprint } from "orthograph";', 'import plugin from "@fixture/echo";', "",
      'export default Blueprint.use(plugin, (p) => [p.choose("loud" as never)]);', ""].join("\n"));
    refuses(root, ["model", "--json"], /choose|choice|option|style/i, ["blueprint/features/echo.ts"]);
    refuses(root, ["generate"], /choose|choice|option|style/i, ["blueprint/features/echo.ts"]);
    expect(digest(root, "generated")).toEqual(generated);
  });
});

describe("01 mounting: through one ortho add feature (M1.10)", () => {
  it("one command writes exactly one mount file with the scaffold header and the default pick, and pins the dependency", () => {
    const { root } = fresh({ kind: "echo", pin: "range" });
    const source = tree(root, "src");
    const added = addFeature(root);
    const lines = added.stdout.trimEnd().split("\n");
    expect(lines[0]).toBe("wrote blueprint/features/echo.ts");
    expect(lines[1]).toMatch(/^pinned @fixture\/echo 1\.0\.0 \(local/);
    expect(lines[2]).toBe("needs none");
    expect(tree(root, "blueprint/features")).toEqual(["blueprint/features/echo.ts"]);
    const file = textAt(root, "blueprint/features/echo.ts");
    expect(file.split("\n")[0]).toMatch(/^\/\/ .*Scaffolded from @fixture\/echo 1\.0\.0\. Yours from now on\.$/);
    expect(file).toContain('import { Blueprint } from "orthograph";');
    expect(file).toContain('from "@fixture/echo"');
    expect(file).toContain("Blueprint.use(");
    expect(file).toContain("choose(");
    expect(file).toMatch(/choices\.style\.plain/);
    expect(file).not.toContain("Blueprint.todo");
    expect(tree(root, "src")).toEqual(source);
    // Pinned exactly: the range the package manager wrote is the installed version.
    const manifest = JSON.parse(textAt(root, "package.json")) as { dependencies: Record<string, string> };
    expect(manifest.dependencies["@fixture/echo"]).toBe("1.0.0");
  });

  it("after it, generate and check succeed with no other step, and the model has the mount", () => {
    const { root } = fresh({ kind: "echo", pin: "range" });
    addFeature(root);
    succeeds(root, "generate");
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(0);
    expect(model(root).mounts?.["echo"]).toMatchObject({ kind: "feature", package: "@fixture/echo", chosen: { style: "plain" } });
    expect(existsSync(join(root, "generated/sdk/src/echo/repeat.ts"))).toBe(true);
  });

  it("--as names the mount, and so prefixes the things", () => {
    const { root } = fresh({ kind: "echo", pin: "range" });
    expect(addFeature(root, "--as", "fixture").stdout).toContain("wrote blueprint/features/fixture.ts");
    expect(Object.keys(model(root).things)).toContain("fixture-echo");
  });

  it("a second add of the same mount is refused and leaves the file and package.json byte for byte", () => {
    const { root } = fresh({ kind: "echo", pin: "range" });
    addFeature(root);
    const file = textAt(root, "blueprint/features/echo.ts");
    const manifest = textAt(root, "package.json");
    const again = run(root, "add", "feature", "@fixture/echo");
    expect(again.status, again.out).not.toBe(0);
    expect(again.out).toContain("blueprint/features/echo.ts already exists");
    expect(textAt(root, "blueprint/features/echo.ts")).toBe(file);
    expect(textAt(root, "package.json")).toBe(manifest);
  });

  it("--dry-run says what it would write and writes nothing", () => {
    const { root } = fresh({ kind: "echo", pin: "range" });
    const manifest = textAt(root, "package.json");
    const blueprint = digest(root, "blueprint");
    const dry = addFeature(root, "--dry-run");
    expect(dry.out).toMatch(/would write blueprint\/features\/echo\.ts/);
    expect(existsSync(join(root, "blueprint/features"))).toBe(false);
    expect(digest(root, "blueprint")).toEqual(blueprint);
    expect(textAt(root, "package.json")).toBe(manifest);
  });

  it("refuses a package that is not a plugin, and a plugin of another kind, writing nothing", () => {
    const { root } = fresh("echo", "plain", "remote");
    const manifest = textAt(root, "package.json");
    succeeds(root, "add", "feature", "@fixture/echo", "--dry-run"); // the command is real: what follows is a refusal, not an unknown command
    const blueprint = digest(root, "blueprint");
    refuses(root, ["add", "feature", "@fixture/plain"], /orthograph|not a (?:feature )?plugin/i, ["@fixture/plain"]);
    refuses(root, ["add", "feature", "@fixture/remote"], /adapter|kind/i, ["@fixture/remote"]);
    refuses(root, ["add", "adapter", "@fixture/echo"], /feature|kind/i, ["@fixture/echo"]);
    refuses(root, ["add", "feature", "@fixture/missing"], /not installed|pnpm add --save-exact/i, ["@fixture/missing", "pnpm add --save-exact @fixture/missing"]);
    expect(digest(root, "blueprint")).toEqual(blueprint);
    expect(textAt(root, "package.json")).toBe(manifest);
  });

  for (const alias of ["../escape", "bad/name", "bad:alias", "1starts-with-digit", "Upper_Case"]) {
    it(`an invalid mount name ${alias} is refused before anything is written`, () => {
      const { root } = fresh({ kind: "echo", pin: "range" });
      succeeds(root, "add", "feature", "@fixture/echo", "--as", "fine", "--dry-run");
      const blueprint = digest(root, "blueprint");
      const manifest = textAt(root, "package.json");
      refuses(root, ["add", "feature", "@fixture/echo", "--as", alias], /name|lowercase|dash/i, [alias]);
      expect(digest(root, "blueprint")).toEqual(blueprint);
      expect(readFileSync(join(root, "package.json"), "utf8")).toBe(manifest);
    });
  }
});
