// Check 07 (M1.05): the three descriptors, as TypeScript sees them. A fixture feature, adapter and projection written as a
// plugin author writes them type-check against `orthograph`; a wrong field, a missing description, an option of another
// choice and a projection whose render has the wrong type do not compile.
//
// Each negative case is one file with one `@ts-expect-error`, and each is exercised twice: with its directive the project
// compiles clean, and with the directive removed tsc reports an error on exactly the line the directive covered. So a
// directive that hides nothing (TS2578) or hides the wrong line fails here. The fixtures are in e2e/fixtures/m1/descriptors.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme, copyOf, fixtures } from "./support.ts";

const source = join(fixtures, "descriptors");
const positives = ["feature-ok.ts", "adapter-ok.ts", "projection-ok.ts"];
const negatives = readdirSync(source).filter((name) => !positives.includes(name)).sort();

const copy = copyOf(acme);
afterAll(copy.remove);

/** tsc --noEmit over the given files of a folder inside the project copy; where each error was reported. */
const tsc = (folder: string, files: ReadonlyArray<string>) => {
  const dir = join(copy.root, ".ortho", folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ extends: join(copy.root, "tsconfig.json"), compilerOptions: { noEmit: true, noUnusedLocals: false }, include: files.map((file) => `./${file}`) }));
  const result = spawnSync(join(copy.root, "node_modules/.bin/tsc"), ["-p", join(dir, "tsconfig.json"), "--pretty", "false"], { cwd: copy.root, encoding: "utf8", timeout: 180_000 });
  const out = `${result.stdout}${result.stderr}`;
  const errors = [
    ...[...out.matchAll(/([^\s(]+\.ts)\((\d+),\d+\): error (TS\d+): (.*)/g)].map((m) => ({ file: m[1]!, line: Number(m[2]), code: m[3]!, message: m[4]! })),
    // The pretty format, should a tsc ignore `--pretty false`: `file.ts:3:37 - error TS2322: message`.
    ...[...out.replace(/\u001b\[[0-9;]*m/g, "").matchAll(/([^\s:]+\.ts):(\d+):\d+ - error (TS\d+): (.*)/g)].map((m) => ({ file: m[1]!, line: Number(m[2]), code: m[3]!, message: m[4]! })),
  ].map((e) => ({ ...e, file: e.file.split("/").at(-1)! }));
  if (result.status !== 0 && errors.length === 0) throw new Error(`tsc failed (status ${String(result.status)}) with no parseable error line:\n${out}`);
  return { status: result.status, out, errors };
};
const put = (folder: string, name: string, text: string) => {
  const dir = join(copy.root, ".ortho", folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), text);
};
const directive = /^\s*\/\/ @ts-expect-error/;

describe("07 descriptors: what a plugin author writes compiles", () => {
  it("a feature, an adapter and a projection descriptor, and the mounts of them, type-check", () => {
    rmSync(join(copy.root, ".ortho/descriptors-ok"), { recursive: true, force: true });
    for (const name of positives) cpSync(join(source, name), join(copy.root, ".ortho/descriptors-ok", name), { recursive: true });
    const result = tsc("descriptors-ok", positives);
    expect(result.errors, result.out).toEqual([]);
    expect(result.status, result.out).toBe(0);
  });
});

describe("07 descriptors: what is wrong does not compile", () => {
  it("has a negative case for each: a wrong field, a missing description, another choice's option, a wrong render", () => {
    expect(negatives).toEqual(expect.arrayContaining(["feature-wrong-field.ts", "feature-missing-description.ts", "feature-other-choice.ts", "projection-wrong-render.ts"]));
    for (const name of negatives) expect(readFileSync(join(source, name), "utf8").split("\n").filter((line) => directive.test(line)), name).toHaveLength(1);
  });

  it("with each directive in place, the cases compile clean (no unused directive, nothing else wrong)", () => {
    for (const name of negatives) put("descriptors-masked", name, readFileSync(join(source, name), "utf8"));
    const result = tsc("descriptors-masked", negatives);
    expect(result.errors, result.out).toEqual([]);
    expect(result.status, result.out).toBe(0);
  });

  it("with each directive removed, tsc reports an error on the line it covered, in its own file", () => {
    const lines: Record<string, number> = {};
    for (const name of negatives) {
      const text = readFileSync(join(source, name), "utf8").split("\n");
      const at = text.findIndex((line) => directive.test(line));
      lines[name] = at + 1;
      // Without the directive, the covered line moves up to the directive's own line number.
      put("descriptors-unmasked", name, text.filter((_, index) => index !== at).join("\n"));
    }
    const result = tsc("descriptors-unmasked", negatives);
    expect(result.status, result.out).not.toBe(0);
    for (const name of negatives) {
      const found = result.errors.filter((error) => error.file === name);
      expect(found.map((error) => error.line), `${name} should fail on line ${lines[name]}\n${result.out}`).toContain(lines[name]);
      expect(found.every((error) => error.code !== "TS2578")).toBe(true);
    }
    // Never because of a name that does not exist: the surface must be there, and wrong in the one way the case says.
    expect(result.errors.filter((error) => /Property '(?:feature|adapter|projection|choice|use|call)' does not exist/.test(error.message))).toEqual([]);
  });
});
