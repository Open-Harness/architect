// Check 08 (Goal 18 slice 6, K44-two-builds call 3, issue #1064): `ortho new app <name>` and `npm create orthograph` make the app
// the preset makes.
//
// The contract judged:
//  - `ortho new app <name>`, run in a folder, makes `<name>/` in it: the starter's blueprint, handlers and journeys exactly as
//    `examples/starter` has them, `generated/` rendered under the new name, and the project files around them (package.json at the
//    preset's own version with an `ortho` script, tsconfig.json, .gitignore, pnpm-workspace.yaml), the files
//    `create-nx-workspace <name> --preset=@orthograph/preset` writes (`packages/preset`). It installs nothing and touches nothing
//    outside `<name>/`. It prints what to do next. (The folder is made in the working directory: no flag is needed.)
//  - an existing empty folder is filled; an existing folder with anything in it is refused, untouched; a name that is not lower
//    case words is refused before anything is written. A refusal exits 2 and its message names the folder or the name.
//  - `npm create orthograph <name>` runs the package `create-orthograph` (`packages/create-orthograph`, bin `create-orthograph`),
//    which makes the same app and refuses the same things, and refuses a missing name, an extra argument, a folder with anything in it (a hidden file too) and a reserved name (`orthograph`, `effect`).
// Expected files come from `examples/starter`, the preset's own version and the generator (`Render.files`), never from what the
// command wrote.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { Effect } from "effect";
import { Render } from "@orthograph/generators/render";
import { IGNORES, TSCONFIG, WORKSPACE, mergeWorkspace, packageJson } from "../../packages/preset/src/modules/starter/internal/project.ts";
import { afterEach, describe, expect, it } from "vitest";
import { cli, repo } from "../layer1/support.ts";

const starter = join(repo, "examples/starter");
const presetVersion = (JSON.parse(readFileSync(join(repo, "packages/preset/package.json"), "utf8")) as { readonly version: string }).version;

const dirs: Array<string> = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
/** A folder of its own, with an `inner/` folder to run in, so that a name that climbs out of it lands somewhere seen. */
const sandbox = () => {
  const outer = mkdtempSync(join(tmpdir(), "ortho-new-app-"));
  dirs.push(outer);
  const cwd = join(outer, "inner");
  mkdirSync(cwd);
  return { outer, cwd };
};

const walk = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)])) : [];
const treeOf = (dir: string): ReadonlyMap<string, string> => new Map(walk(dir).map((f) => [relative(dir, f), readFileSync(f, "utf8")]));

const spawn = (command: ReadonlyArray<string>, cwd: string) => {
  const r = spawnSync(process.execPath, [...command], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, out: `${r.stdout}${r.stderr}` };
};
const newApp = (cwd: string, ...args: ReadonlyArray<string>) => spawn([cli, "new", "app", ...args], cwd);

const createPackage = join(repo, "packages/create-orthograph");
/** The file `npm create orthograph` runs: the package's `bin`. A package that isn't there fails the test with that said. */
const createBin = (): string => {
  const file = join(createPackage, "package.json");
  if (!existsSync(file)) throw new Error("packages/create-orthograph/package.json does not exist: there is no `create-orthograph` package for `npm create orthograph` to run");
  const bin = (JSON.parse(readFileSync(file, "utf8")) as { readonly bin?: Readonly<Record<string, string>> }).bin?.["create-orthograph"];
  if (bin === undefined) throw new Error("packages/create-orthograph/package.json has no bin `create-orthograph`");
  return join(createPackage, bin);
};
const create = (cwd: string, ...args: ReadonlyArray<string>) => spawn([createBin(), ...args], cwd);

/** The two ways in. Each is run in a folder, with the name (and anything else) as arguments. */
const ways = [
  { way: "ortho new app", run: newApp },
  { way: "npm create orthograph (create-orthograph)", run: create },
] as const;

const BAD_NAMES = ["Bakery", "my bakery", "../escape", "a/b", "bakery-"];

describe("08 ortho new app: controls", () => {
  it("`ortho new adapter` without --from-openapi still says what it needs, exit 2 (the neighbour this command sits beside)", () => {
    const { cwd } = sandbox();
    const r = spawn([cli, "new", "adapter", "rates"], cwd);
    expect(r.status, r.out).toBe(2);
    expect(r.out).toContain("--from-openapi");
  });
});

describe("08 ortho new app: what it makes", () => {
  for (const name of ["bakery", "pastry-shop", "tickets"]) {
    it(`${name}: the starter's blueprint, handlers and journeys unchanged, exit 0, nothing outside ${name}/`, () => {
      const { outer, cwd } = sandbox();
      const r = newApp(cwd, name);
      expect(r.status, r.out).toBe(0);
      expect(readdirSync(cwd)).toEqual([name]);
      expect(readdirSync(outer)).toEqual(["inner"]);
      const made = treeOf(join(cwd, name));
      for (const part of ["blueprint", "src", "journeys"]) {
        const expected = treeOf(join(starter, part));
        expect(expected.size, `the starter has files under ${part}/`).toBeGreaterThan(0);
        const got = new Map([...made].filter(([p]) => p.startsWith(`${part}/`)).map(([p, c]) => [p.slice(part.length + 1), c]));
        expect([...got.keys()].sort(), `${part}/ files`).toEqual([...expected.keys()].sort());
        for (const [p, c] of expected) expect(got.get(p), `${part}/${p}`).toBe(c);
      }
    });

    it(`${name}: generated/ is rendered under the name, not under the starter's; no scaffold is written over a handler`, () => {
      const { cwd } = sandbox();
      expect(newApp(cwd, name).status).toBe(0);
      const made = treeOf(join(cwd, name));
      const model = JSON.parse(readFileSync(join(starter, "generated/model/model.json"), "utf8")) as Parameters<typeof Render.files>[0]["model"];
      const expected = Effect.runSync(Render.files({ name, model })).filter((f) => !f.scaffold);
      expect(expected.length).toBeGreaterThan(0);
      for (const f of expected) expect(made.get(f.path), f.path).toBe(f.content);
      const generated = [...made.keys()].filter((p) => p.startsWith("generated/")).sort();
      expect(generated).toEqual(expected.map((f) => f.path).sort());
      expect(made.get("generated/cli/src/main.ts")).toContain(name);
      expect(made.get("generated/cli/src/main.ts")).not.toContain("starter");
    });
  }

  it("the project files equal the preset's own, whole: package.json, tsconfig.json, .gitignore, pnpm-workspace.yaml", () => {
    const { cwd } = sandbox();
    expect(newApp(cwd, "bakery").status).toBe(0);
    const made = treeOf(join(cwd, "bakery"));
    // package.json: the preset's `packageJson`, whole (type, packageManager, scripts, bin, every dependency and dev tool). The preset
    // sets no name or version of its own (create-nx-workspace does), so the command may set `name`, and only as the app's name.
    const { name: named, version: versioned, ...pkg } = JSON.parse(made.get("package.json") ?? "null") as Record<string, unknown>;
    expect(pkg, "package.json").toEqual(packageJson({}, "bakery", presetVersion));
    expect([undefined, "bakery"]).toContain(named);
    expect([undefined, "0.0.0"]).toContain(versioned);
    expect(made.get("package.json")).not.toContain("workspace:");
    expect(JSON.parse(made.get("tsconfig.json") ?? "null"), "tsconfig.json").toEqual(TSCONFIG);
    expect(made.get(".gitignore"), ".gitignore").toBe(IGNORES.join("\n") + "\n");
    expect(made.get("pnpm-workspace.yaml"), "pnpm-workspace.yaml").toBe(mergeWorkspace("", WORKSPACE));
    expect(made.get("pnpm-workspace.yaml")).toContain("kysely");
  });

  it("the app's whole file set is the starter's parts, generated/ and the four project files: nothing else at any level", () => {
    const { cwd } = sandbox();
    expect(newApp(cwd, "bakery").status).toBe(0);
    const model = JSON.parse(readFileSync(join(starter, "generated/model/model.json"), "utf8")) as Parameters<typeof Render.files>[0]["model"];
    const expected = [
      ...["blueprint", "src", "journeys"].flatMap((p) => [...treeOf(join(starter, p)).keys()].map((k) => `${p}/${k}`)),
      ...Effect.runSync(Render.files({ name: "bakery", model })).filter((f) => !f.scaffold).map((f) => f.path),
      "package.json", "tsconfig.json", ".gitignore", "pnpm-workspace.yaml",
    ].sort();
    expect([...treeOf(join(cwd, "bakery")).keys()].sort()).toEqual(expected);
  });

  it("installs nothing: no node_modules, no lockfile", () => {
    const { cwd } = sandbox();
    expect(newApp(cwd, "bakery").status).toBe(0);
    const made = [...treeOf(join(cwd, "bakery")).keys()];
    expect(made.filter((p) => p.startsWith("node_modules/") || /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?)$/.test(p))).toEqual([]);
  });

  it("prints the next steps: go into the folder, install, check, prove", () => {
    const { cwd } = sandbox();
    const r = newApp(cwd, "bakery");
    expect(r.status, r.out).toBe(0);
    for (const step of ["cd bakery", "pnpm install", "pnpm ortho check", "pnpm ortho prove"]) expect(r.stdout, step).toContain(step);
  });

  it("fills an existing empty folder", () => {
    const { cwd } = sandbox();
    mkdirSync(join(cwd, "bakery"));
    const r = newApp(cwd, "bakery");
    expect(r.status, r.out).toBe(0);
    expect([...treeOf(join(cwd, "bakery")).keys()].some((p) => p.startsWith("blueprint/"))).toBe(true);
  });

  it("`ortho new --help` lists `app` beside `adapter`", () => {
    const { cwd } = sandbox();
    const r = spawn([cli, "new", "--help"], cwd);
    expect(r.out).toMatch(/\bapp\b/);
    expect(r.out).toMatch(/\badapter\b/);
  });
});

for (const { way, run } of ways) {
  describe(`08 refusals: ${way}`, () => {
    it("refuses a folder with anything in it: exit 2, the message names the folder, its files are untouched, nothing added", () => {
      const { cwd } = sandbox();
      const target = join(cwd, "bakery");
      mkdirSync(target);
      writeFileSync(join(target, "notes.txt"), "mine\n");
      const r = run(cwd, "bakery");
      expect(r.status, r.out).toBe(2);
      expect(r.stderr).toContain("bakery");
      expect(r.stderr).toMatch(/not empty|already exists/i);
      expect([...treeOf(target)]).toEqual([["notes.txt", "mine\n"]]);
    });

    it("refuses a file in the folder's place: exit 2, the file untouched", () => {
      const { cwd } = sandbox();
      writeFileSync(join(cwd, "bakery"), "a file\n");
      const r = run(cwd, "bakery");
      expect(r.status, r.out).toBe(2);
      expect(r.stderr).toContain("bakery");
      expect(readFileSync(join(cwd, "bakery"), "utf8")).toBe("a file\n");
    });

    it("refuses a folder holding only a hidden file as not empty: exit 2, the hidden file untouched", () => {
      const { cwd } = sandbox();
      const target = join(cwd, "bakery");
      mkdirSync(target);
      writeFileSync(join(target, ".env"), "k=v\n");
      const r = run(cwd, "bakery");
      expect(r.status, r.out).toBe(2);
      expect(r.stderr).toContain("bakery");
      expect(r.stderr).toMatch(/not empty|already exists/i);
      expect([...treeOf(target)]).toEqual([[".env", "k=v\n"]]);
    });

    it("refuses no name: exit 2, the message says a name is needed; nothing is written", () => {
      const { cwd } = sandbox();
      const r = run(cwd);
      expect(r.status, r.out).toBe(2);
      expect(r.stderr).toMatch(/\bname\b/i);
      expect(readdirSync(cwd)).toEqual([]);
    });

    it("refuses an extra argument: exit 2, the message names it; nothing is written", () => {
      const { cwd } = sandbox();
      const r = run(cwd, "bakery", "surplus");
      expect(r.status, r.out).toBe(2);
      expect(r.stderr).toContain("surplus");
      expect(readdirSync(cwd)).toEqual([]);
    });

    for (const reserved of ["orthograph", "effect"]) {
      it(`refuses the reserved name ${reserved} (a package that would depend on itself): exit 2, the message names it and says reserved`, () => {
        const { cwd } = sandbox();
        const r = run(cwd, reserved);
        expect(r.status, r.out).toBe(2);
        expect(r.stderr).toContain(reserved);
        expect(r.stderr).toMatch(/reserved/i);
        expect(readdirSync(cwd)).toEqual([]);
      });
    }

    for (const bad of BAD_NAMES) {
      it(`refuses the name ${JSON.stringify(bad)} before writing anything: exit 2, the message names it and says lower case words`, () => {
        const { outer, cwd } = sandbox();
        const r = run(cwd, bad);
        expect(r.status, r.out).toBe(2);
        expect(r.stderr).toContain(bad);
        expect(r.stderr).toMatch(/lower[- ]case/i);
        expect(readdirSync(cwd)).toEqual([]);
        expect(readdirSync(outer)).toEqual(["inner"]);
      });
    }
  });
}

describe("08 npm create orthograph", () => {
  it("is the package `create-orthograph`: bin `create-orthograph` that exists, published public from dist, Apache-2.0", () => {
    const pkg = JSON.parse(readFileSync(join(createPackage, "package.json"), "utf8")) as {
      readonly name: string; readonly license: string; readonly bin: Readonly<Record<string, string>>;
      readonly publishConfig?: { readonly access?: string; readonly bin?: Readonly<Record<string, string>> };
    };
    expect(pkg.name).toBe("create-orthograph");
    expect(pkg.license).toBe("Apache-2.0");
    expect(Object.keys(pkg.bin)).toEqual(["create-orthograph"]);
    expect(existsSync(join(createPackage, pkg.bin["create-orthograph"]!))).toBe(true);
    expect(pkg.publishConfig?.access).toBe("public");
    expect(pkg.publishConfig?.bin?.["create-orthograph"]).toMatch(/^\.\/dist\/.+\.js$/);
  });

  it("`create-orthograph bakery` makes exactly the app `ortho new app bakery` makes, and prints the next steps", () => {
    const viaOrtho = sandbox();
    const viaCreate = sandbox();
    expect(newApp(viaOrtho.cwd, "bakery").status).toBe(0);
    const r = create(viaCreate.cwd, "bakery");
    expect(r.status, r.out).toBe(0);
    expect(readdirSync(viaCreate.cwd)).toEqual(["bakery"]);
    const expected = treeOf(join(viaOrtho.cwd, "bakery"));
    const got = treeOf(join(viaCreate.cwd, "bakery"));
    expect(expected.size).toBeGreaterThan(0);
    expect([...got.keys()].sort()).toEqual([...expected.keys()].sort());
    for (const [p, c] of expected) expect(got.get(p), p).toBe(c);
    for (const step of ["cd bakery", "pnpm install", "pnpm ortho check"]) expect(r.stdout, step).toContain(step);
  });
});
