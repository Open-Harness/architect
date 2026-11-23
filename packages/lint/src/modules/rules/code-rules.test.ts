// The three code-hygiene rules (effect-only, max-lines, six-slots), run by real oxlint on a project laid out in a temp folder.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../../../..");
const T = { timeout: 60_000 };

/** Lays `files` out in its own temp project, lints its .ts/.tsx files with one rule, gives back `<path> <rule>` per report. */
const lint = (rule: string, options: unknown, files: Record<string, string>): ReadonlyArray<string> => {
  const root = mkdtempSync(join(tmpdir(), "ortho-lint-"));
  try {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
    const config = { jsPlugins: [resolve(import.meta.dirname, "../../main.ts")], categories: { correctness: "off" }, plugins: [], rules: { [`ortho/${rule}`]: ["error", options] } };
    writeFileSync(join(root, "oxlintrc.json"), JSON.stringify(config));
    const targets = Object.keys(files).filter((p) => /\.tsx?$/.test(p));
    const run = spawnSync(join(repo, "node_modules/.bin/oxlint"), ["-c", "oxlintrc.json", "--no-ignore", "--format", "unix", ...targets], { cwd: root, encoding: "utf8" });
    return run.stdout.split("\n").flatMap((l) => {
      const m = /^(.+?):\d+:\d+: .* \[Error\/ortho\((.+?)\)\]$/.exec(l);
      return m ? [`${m[1]} ${m[2]}`] : [];
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const src = "packages/a/src";
const eight = [
  `declare const Effect: any;`,
  `export const a = async () => 1;`,
  `export const b = () => { try { return 1; } catch { return 2; } };`,
  `export const c = () => { throw new Error("x"); };`,
  `export const d = Date.now();`,
  `export const e = new Date();`,
  `setTimeout(() => 0, 1);`,
  `export const g = Effect.sleep("1 second");`,
  `export const f = await Promise.resolve(1);`,
].join("\n");

describe("ortho/effect-only", () => {
  const run = (files: Record<string, string>, options: unknown = {}) => lint("effect-only", options, files);

  it("reports each of async, await, try, throw, Date.now, new Date(), setTimeout and Effect.sleep once", T, () => {
    expect(run({ [`${src}/x.ts`]: eight })).toEqual(Array(8).fill(`${src}/x.ts effect-only`));
  });

  it("reports SQL that reads the database's clock: now(), CURRENT_TIMESTAMP and datetime('now')", T, () => {
    const sql = [
      "export const a = `INSERT INTO t (at) VALUES (now())`;",
      `export const b = "UPDATE t SET at = CURRENT_TIMESTAMP";`,
      `export const c = "SELECT datetime('now')";`,
      `export const d = "INSERT INTO t (at) VALUES (?)";`,
    ].join("\n");
    expect(run({ [`${src}/x.ts`]: sql })).toEqual(Array(3).fill(`${src}/x.ts effect-only`));
  });

  it("reports async functions and methods and setInterval; leaves new Date(0) and Date as a type", T, () => {
    expect(run({
      [`${src}/x.ts`]: `export async function f() {}\nexport const o = { async m() {} };\nsetInterval(() => 0, 1);\n`,
      [`${src}/ok.ts`]: `export const z = new Date(0);\nexport type T = Date;\nexport const f = (d: Date) => d.getTime();\n`,
    })).toEqual(Array(3).fill(`${src}/x.ts effect-only`));
  });

  it("reports a for await loop once (plus its async function), an await using declaration once, and global/window timers", T, () => {
    expect(run({
      [`${src}/loop.ts`]: `declare const xs: any;\nexport const f = async () => { for await (const x of xs) { void x; } };\n`,
      [`${src}/using.ts`]: `declare const res: any;\nawait using r = res;\nexport { r };\n`,
      [`${src}/timers.ts`]: `declare const window: any;\nglobalThis.setTimeout(() => 0, 1);\nglobalThis.setInterval(() => 0, 1);\nwindow.setTimeout(() => 0, 1);\nwindow.setInterval(() => 0, 1);\n`,
    }).toSorted()).toEqual([
      ...Array(2).fill(`${src}/loop.ts effect-only`), `${src}/using.ts effect-only`, ...Array(4).fill(`${src}/timers.ts effect-only`),
    ].toSorted());
  });

  it("exempts the package's src/main.ts, test files and listed entries, but not a nested main.ts", T, () => {
    expect(run({
      [`${src}/main.ts`]: eight,
      [`${src}/x.test.ts`]: eight,
      [`${src}/y.test.tsx`]: eight,
      [`${src}/cli/bin.ts`]: eight,
      [`${src}/modules/x/main.ts`]: `export const d = Date.now();\n`,
    }, { entries: [`${src}/cli/bin.ts`] })).toEqual([`${src}/modules/x/main.ts effect-only`]);
  });

  it("leaves files outside packages/<pkg>/src/ and generated/ paths alone", T, () => {
    expect(run({
      "tools/x.ts": eight,
      "packages/a/test/x.ts": eight,
      "packages/a/scripts/y.ts": eight,
      [`${src}/generated/x.ts`]: eight,
      [`${src}/modules/m/generated/x.ts`]: eight,
    })).toEqual([]);
  });

  it("baseline: at its count reports nothing, over reports all, no entry reports", T, () => {
    const two = `export const a = Date.now();\nexport const b = Date.now();\n`;
    expect(run({
      "base.json": JSON.stringify({ "effect-only": { [`${src}/at.ts`]: 2, [`${src}/over.ts`]: 1 } }),
      [`${src}/at.ts`]: two,
      [`${src}/over.ts`]: two,
      [`${src}/new.ts`]: `export const a = Date.now();\n`,
    }, { baseline: "base.json" }).toSorted()).toEqual([`${src}/new.ts effect-only`, `${src}/over.ts effect-only`, `${src}/over.ts effect-only`]);
  });

  it("baseline: a missing file counts as zero", T, () => {
    expect(run({ [`${src}/x.ts`]: `export const a = Date.now();\n` }, { baseline: "nope.json" })).toEqual([`${src}/x.ts effect-only`]);
  });
});

describe("ortho/max-lines", () => {
  const run = (files: Record<string, string>, options: unknown = {}) => lint("max-lines", options, files);
  const code = (n: number) => Array.from({ length: n }, (_, i) => `export const v${i} = ${i};`);

  it("reports 251 code lines and not 250", T, () => {
    expect(run({ [`${src}/big.ts`]: code(251).join("\n"), [`${src}/fit.ts`]: code(250).join("\n") })).toEqual([`${src}/big.ts max-lines`]);
  });

  it("does not count blank or comment-only lines, and counts code with a trailing comment", T, () => {
    const lines = [...code(240), ...Array(30).fill(""), ...Array(20).fill("// note"), "/*", ...Array(8).fill(" * inside"), " */"];
    expect(lines.length).toBe(300);
    expect(run({ [`${src}/fit.ts`]: lines.join("\n") })).toEqual([]);
    expect(run({ [`${src}/over.ts`]: [...code(250), `export const last = 1; // trailing`].join("\n") })).toEqual([`${src}/over.ts max-lines`]);
  });

  it("honours max, and does not exempt test files", T, () => {
    expect(run({ [`${src}/x.test.ts`]: code(11).join("\n"), [`${src}/y.ts`]: code(10).join("\n") }, { max: 10 })).toEqual([`${src}/x.test.ts max-lines`]);
  });

  it("baseline: at its count (1) reports nothing; a file with no entry reports", T, () => {
    expect(run({
      "base.json": JSON.stringify({ "max-lines": { [`${src}/old.ts`]: 1 } }),
      [`${src}/old.ts`]: code(11).join("\n"),
      [`${src}/new.ts`]: code(11).join("\n"),
    }, { max: 10, baseline: "base.json" })).toEqual([`${src}/new.ts max-lines`]);
  });
});

describe("ortho/six-slots", () => {
  const run = (files: Record<string, string>, options: unknown = {}) => lint("six-slots", options, files);
  const m = `${src}/modules/m`;
  const full = { [`${m}/README.md`]: "# m\n", [`${m}/types.ts`]: "export {};\n", [`${m}/service.ts`]: "export {};\n", [`${m}/internal/x.ts`]: "export {};\n", [`${m}/m.test.ts`]: "export {};\n" };

  it("a complete module and files outside a module report nothing", T, () => {
    expect(run({ ...full, [`${src}/index.ts`]: "export {};\n" })).toEqual([]);
  });

  it("a module missing internal/ and its test is reported twice, from its first direct-child file", T, () => {
    const { [`${m}/internal/x.ts`]: _i, [`${m}/m.test.ts`]: _t, ...rest } = full;
    expect(run(rest)).toEqual(Array(2).fill(`${m}/service.ts six-slots`));
  });

  it("is reported once per module even when deeper files are linted too", T, () => {
    const { [`${m}/m.test.ts`]: _t, ...rest } = full;
    expect(run(rest)).toEqual([`${m}/service.ts six-slots`]);
  });

  it("a module with only internal/x.ts is reported from that file, once per missing slot", T, () => {
    expect(run({ [`${m}/internal/x.ts`]: "export {};\n" })).toEqual(Array(4).fill(`${m}/internal/x.ts six-slots`));
  });

  it("baseline is keyed on the module folder: a new file sorting before the anchor still reports nothing", T, () => {
    expect(run({
      "base.json": JSON.stringify({ "six-slots": { [m]: 2 } }),
      [`${m}/README.md`]: "", [`${m}/types.ts`]: "export {};\n", [`${m}/service.ts`]: "export {};\n", [`${m}/aaa.ts`]: "export {};\n",
    }, { baseline: "base.json" })).toEqual([]);
  });

  it("baseline: at its count reports nothing; another module with no entry reports", T, () => {
    expect(run({
      "base.json": JSON.stringify({ "six-slots": { [m]: 2 } }),
      [`${m}/README.md`]: "", [`${m}/types.ts`]: "export {};\n", [`${m}/service.ts`]: "export {};\n",
      [`${src}/modules/n/types.ts`]: "export {};\n",
    }, { baseline: "base.json" })).toEqual(Array(4).fill(`${src}/modules/n/types.ts six-slots`));
  });
});
