// `prove --changed`'s selection, from a record and today's files: what it reruns, what it skips, when it cannot tell.
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { select, settle } from "./internal/changed.ts";
import { stampOf } from "./internal/files.ts";
import { Impact } from "./service.ts";
import type { Proof } from "./types.ts";

const A = "journeys/a.ts";
const B = "journeys/b.ts";
const OPEN = "src/box/open.ts";
const SHUT = "src/box/shut.ts";
const operation = (name: string, verb: string, calls: ReadonlyArray<string> = []) => ({
  kind: "operation", name, thing: "box", verb, file: `blueprint/things/box/verbs/${verb}.ts`, from: { kind: "app" }, runs: "server", hash: name,
  payload: {}, answer: {}, allowed: [],
  steps: Object.fromEntries(calls.map((mount) => [mount, { call: { mount, call: "quote", mode: "effect" } }])),
});
const journey = (file: string, name: string, calls: ReadonlyArray<string>) => ({ file, name, starts: null, steps: calls.map((call) => ({ title: call, call: { operation: call }, checks: [] })) });
const modelOf = (mounts: Record<string, unknown> = {}, names: readonly [string, string] = ["a", "b"]) => ({
  operations: { "box.open": operation("box.open", "open", Object.keys(mounts)), "box.shut": operation("box.shut", "shut") },
  journeys: { [A]: journey(A, names[0], ["box.open"]), [B]: journey(B, names[1], ["box.shut"]) },
  startingWorlds: {}, things: {}, mounts,
}) as unknown as Model;
const model = modelOf();

const roots: Array<string> = [];
const project = (workspace?: string) => {
  const parent = workspace ?? mkdtempSync(join(tmpdir(), "changed-"));
  const root = workspace === undefined ? parent : join(parent, "app");
  roots.push(parent);
  for (const file of ["blueprint/things/box/verbs/open.ts", "blueprint/things/box/verbs/shut.ts", OPEN, SHUT, A, B, "generated/server/main.ts"]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), `// ${file}\n`);
  }
  writeFileSync(join(root, "package.json"), "{}\n");
  return root;
};
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

const ran = { journeys: [{ file: A, passed: true }, { file: B, passed: true }], operations: [{ operation: "box.open", passed: true }, { operation: "box.shut", passed: true }] };
const proven = (root: string, of: Model = model): Proof => settle(stampOf(root, of), undefined, ran);
const choose = (root: string, record: Proof | undefined, of: Model = model) => select(stampOf(root, of), of, record);
const write = (root: string, file: string, text: string) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); };

describe("select", () => {
  it("says there is no record when there is none", () => {
    expect(choose(project(), undefined).fellBack).toEqual({ reason: "no record of an earlier prove", files: [] });
  });

  it("reruns nothing when nothing changed", () => {
    const root = project();
    expect(choose(root, proven(root))).toEqual({ rerun: [], skipped: [A, B], judge: [], fellBack: null });
  });

  it("reruns the journeys that call an operation whose handler changed, and judges its evals", () => {
    const root = project();
    const record = proven(root);
    write(root, OPEN, "// changed\n");
    expect(choose(root, record)).toEqual({ rerun: [A], skipped: [B], judge: ["box.open"], fellBack: null });
  });

  it("reruns a changed journey alone, without judging any evals", () => {
    const root = project();
    const record = proven(root);
    write(root, B, "// changed\n");
    expect(choose(root, record)).toEqual({ rerun: [B], skipped: [A], judge: [], fellBack: null });
  });

  it("proves everything, naming the files, when one it cannot place changed or is new", () => {
    const root = project();
    const record = proven(root);
    write(root, "package.json", "{ }\n");
    write(root, "src/box/helper.ts", "export {};\n");
    expect(choose(root, record).fellBack).toEqual({ reason: "cannot place package.json, src/box/helper.ts", files: ["package.json", "src/box/helper.ts"] });
  });

  it("keeps a failure until it passes: a journey and an operation that did not pass are rerun", () => {
    const root = project();
    const record = settle(stampOf(root, model), undefined, { journeys: [{ file: A, passed: false }, { file: B, passed: true }], operations: [{ operation: "box.open", passed: false }, { operation: "box.shut", passed: true }] });
    expect(choose(root, record)).toEqual({ rerun: [A], skipped: [B], judge: ["box.open"], fellBack: null });
  });

  it("reruns the callers of an operation when an adapter it calls changed (its mount hash), though no file did", () => {
    const root = project();
    const before = modelOf({ pricing: { kind: "adapter", hash: "v1" } });
    const record = proven(root, before);
    expect(choose(root, record, before).rerun).toEqual([]);
    expect(choose(root, record, modelOf({ pricing: { kind: "adapter", hash: "v2" } }))).toEqual({ rerun: [A], skipped: [B], judge: ["box.open"], fellBack: null });
  });

  it("tracks two journeys that share a name apart: editing the first reruns it and not the other", () => {
    const root = project();
    const same = modelOf({}, ["twin", "twin"]);
    const record = proven(root, same);
    write(root, A, "// changed\n");
    expect(choose(root, record, same)).toEqual({ rerun: [A], skipped: [B], judge: [], fellBack: null });
    expect(Object.keys(record.journeys)).toEqual([A, B]);
  });
});

describe("what an operation reaches by importing", () => {
  it("proves everything, naming the file, when generated/ changed: the server is made there", () => {
    const root = project();
    const record = proven(root);
    write(root, "generated/server/main.ts", "throw new Error('x');\n");
    expect(choose(root, record).fellBack).toEqual({ reason: "cannot place generated/server/main.ts", files: ["generated/server/main.ts"] });
  });

  it("reruns the callers of every operation whose handler imports the changed file, however far", () => {
    const root = project();
    write(root, SHUT, 'import { value } from "./middle.ts";\nexport default value;\n');
    write(root, "src/box/middle.ts", 'export { value } from "./open.ts";\n');
    const record = proven(root);
    write(root, OPEN, "export const value = 2;\n");
    expect(choose(root, record)).toEqual({ rerun: [A, B], skipped: [], judge: ["box.open", "box.shut"], fellBack: null });
  });

  it("does not place a file no handler, declaration, journey or starting world reaches", () => {
    const root = project();
    write(root, "src/box/unused.ts", "export {};\n");
    const record = proven(root);
    write(root, "src/box/unused.ts", "export const x = 1;\n");
    expect(choose(root, record).fellBack?.files).toEqual(["src/box/unused.ts"]);
  });

  it("proves everything when a handler's import cannot be followed and the file it names is not there", () => {
    const root = project();
    write(root, SHUT, 'import "./missing.ts";\nimport "#alias/x";\n');
    const record = proven(root);
    write(root, SHUT, 'import "./missing.ts";\nimport "#alias/x";\n// edited\n');
    expect(choose(root, record).fellBack).toEqual({ reason: `cannot place ${SHUT}`, files: [SHUT] });
  });

  it("proves everything when a handler imports or requires something whose specifier is not a literal", () => {
    for (const line of ["await import(`./${name}.ts`);", "require(name);", "import(target)"]) {
      const root = project();
      write(root, SHUT, `export default async (name: string, target: string) => { ${line} };\n`);
      const record = proven(root);
      // The real target sits in another handler's closure: the operation that cannot say where it imports rests on every file.
      write(root, OPEN, "// the real target\n");
      expect(choose(root, record).rerun, line).toEqual([A, B]);
      write(root, SHUT, `export default async (name: string, target: string) => { ${line} }; // edited\n`);
      expect(choose(root, record).fellBack?.files, line).toEqual([SHUT]);
    }
  });

  it("proves everything when a handler reads a file at runtime that another handler imports: it rests on every file", () => {
    const root = project();
    write(root, "src/box/data.json", "{}\n");
    write(root, OPEN, 'import data from "./data.json";\nexport default data;\n');
    write(root, SHUT, 'import { readFileSync } from "node:fs";\nexport default readFileSync(new URL("./data.json", import.meta.url));\n');
    const record = proven(root);
    write(root, "src/box/data.json", '{ "changed": true }\n');
    expect(choose(root, record)).toEqual({ rerun: [A, B], skipped: [], judge: ["box.open", "box.shut"], fellBack: null });
  });

  it("sees a file outside the usual folders that a handler imports", () => {
    const root = project();
    write(root, SHUT, 'import { x } from "../../lib/x.ts";\nexport default x;\n');
    write(root, "lib/x.ts", "export const x = 1;\n");
    const record = proven(root);
    expect(record.files["lib/x.ts"]).toBeDefined();
    write(root, "lib/x.ts", "export const x = 2;\n");
    expect(choose(root, record)).toEqual({ rerun: [B], skipped: [A], judge: ["box.shut"], fellBack: null });
  });
});

describe("the record", () => {
  it("is the stamp taken before the run: an edit made while it ran is seen by the next one", () => {
    const root = project();
    const before = stampOf(root, model);
    write(root, OPEN, "// edited while the run was going\n");
    const record = settle(before, undefined, ran);
    expect(choose(root, record)).toEqual({ rerun: [A], skipped: [B], judge: ["box.open"], fellBack: null });
  });

  it("is no record when proven.json is corrupt, partial or not a ledger: it proves everything and says why", () => {
    const root = project();
    for (const text of ["{ not json", "{}", '{"model":{},"proven":{},"changed":{"files":{},"journeys":3}}', "null"]) {
      write(root, ".ortho/evidence/proven.json", text);
      const chosen = Effect.runSync(Impact.select(root, model, stampOf(root, model)));
      expect(chosen.fellBack?.reason, text).toMatch(/no record of an earlier prove/);
      expect(chosen.rerun).toEqual([A, B]);
    }
  });

  it("hashes the lockfile of the workspace the project sits in", () => {
    const parent = mkdtempSync(join(tmpdir(), "workspace-"));
    writeFileSync(join(parent, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const root = project(parent);
    const record = proven(root);
    expect(Object.keys(record.files)).toContain("<workspace>/pnpm-lock.yaml");
    writeFileSync(join(parent, "pnpm-lock.yaml"), "lockfileVersion: '9.1'\n");
    expect(choose(root, record).fellBack?.files).toEqual(["<workspace>/pnpm-lock.yaml"]);
  });

  it("leaves tests alone, and notes outside src/ and blueprint/, but hashes a note where code may read it", () => {
    const root = project();
    write(root, "src/box/open.test.ts", "// a test\n");
    write(root, "journeys/README.md", "# notes\n");
    write(root, "src/box/notes.md", "# read at runtime?\n");
    const record = proven(root);
    expect(Object.keys(record.files).filter((f) => f.endsWith(".test.ts") || f === "journeys/README.md")).toEqual([]);
    expect(record.files["src/box/notes.md"]).toBeDefined();
    write(root, "src/box/open.test.ts", "// changed\n");
    expect(choose(root, record).rerun).toEqual([]);
  });
});

describe("a package the project runs from source", () => {
  const linked = (spec: string, link = true) => {
    const root = project();
    const sibling = join(dirname(root), "sibling");
    write(sibling, "package.json", '{ "name": "sibling" }\n');
    write(sibling, "src/index.ts", "export const x = 1;\n");
    write(sibling, "src/index.test.ts", "// a test\n");
    write(sibling, "README.md", "# notes\n");
    write(root, "package.json", JSON.stringify({ dependencies: { sibling: spec } }));
    mkdirSync(join(root, "node_modules"), { recursive: true });
    if (link) symlinkSync(sibling, join(root, "node_modules/sibling"));
    else write(root, "node_modules/sibling/src/index.ts", "export const x = 1;\n");
    return { root, sibling };
  };

  it("proves everything, naming the package, when a workspace sibling linked through node_modules changed", () => {
    const { root, sibling } = linked("workspace:*");
    const record = proven(root);
    expect(Object.keys(record.files)).toContain("<package:sibling>/src/index.ts");
    expect(Object.keys(record.files).filter((f) => f.startsWith("<package") && (f.endsWith(".test.ts") || f.endsWith(".md")))).toEqual([]);
    expect(choose(root, record).rerun).toEqual([]);
    write(sibling, "src/index.ts", "export const x = 2;\n");
    expect(choose(root, record).fellBack).toEqual({ reason: "cannot place <package:sibling>/src/index.ts", files: ["<package:sibling>/src/index.ts"] });
  });

  it("does the same for any symlink that leaves the package store, whatever the project declares", () => {
    const { root, sibling } = linked("^1.0.0");
    const record = proven(root);
    write(sibling, "src/index.ts", "export const x = 3;\n");
    expect(choose(root, record).fellBack?.files).toEqual(["<package:sibling>/src/index.ts"]);
  });

  it("hashes a file: dependency that was copied in", () => {
    const { root } = linked("file:../sibling", false);
    const record = proven(root);
    write(root, "node_modules/sibling/src/index.ts", "export const x = 4;\n");
    expect(choose(root, record).fellBack?.files).toEqual(["<package:sibling>/src/index.ts"]);
  });

  it("leaves an installed package alone: a symlink into the store is the lockfile's to say", () => {
    const root = project();
    const store = join(dirname(root), "store/node_modules/.pnpm/dep@1.0.0/node_modules/dep");
    write(store, "index.js", "export {};\n");
    write(root, "package.json", JSON.stringify({ dependencies: { dep: "1.0.0" } }));
    mkdirSync(join(root, "node_modules"), { recursive: true });
    symlinkSync(store, join(root, "node_modules/dep"));
    const record = proven(root);
    expect(Object.keys(record.files).filter((f) => f.startsWith("<package"))).toEqual([]);
  });
});
