// M1.17's done-when, on the real fixture feature (`tools/fixtures/vault`) and the real acme: a feature with its own
// store mounts beside acme's default and acme is unchanged; an operation writing two stores fails to compile.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { basename, dirname, join, relative, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { BlueprintInvalid } from "./types.ts";
import { Compiler } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const vault = join(repo, "tools/fixtures/vault");
// Under the package, so `orthograph` resolves from the copy the way a project's own imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/vault");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const sources = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((entry) => (statSync(join(dir, entry)).isDirectory() ? sources(join(dir, entry)) : entry.endsWith(".ts") ? [join(dir, entry)] : []));

/** The fixture as an installed package: its TypeScript with the types stripped, as `.js`, under `node_modules`. A variant is laid over it. */
const install = (root: string, variant?: string) => {
  const plugin = join(root, "node_modules/@fixture/vault");
  for (const from of [join(vault, "source"), ...(variant ? [join(vault, "variants", variant)] : [])]) {
    for (const file of sources(from)) {
      const to = join(plugin, relative(from, file)).replace(/\.ts$/, ".js");
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, stripTypeScriptTypes(readFileSync(file, "utf8")));
    }
  }
  const manifest = JSON.parse(readFileSync(join(vault, "package.json"), "utf8")) as Record<string, unknown>;
  writeFileSync(join(plugin, "package.json"), JSON.stringify({ ...manifest, exports: { ".": "./feature.js" }, orthograph: { kind: "feature", blueprint: "./blueprint" } }));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "acme", version: "0.0.0", type: "module", dependencies: { "@fixture/vault": "1.0.0" } }));
};

let n = 0;
/** A copy of acme's blueprint with the fixture installed and mounted under its own name. */
const project = (variant?: string): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, `p${n++}-`));
  cpSync(join(acme, "blueprint"), join(root, "blueprint"), { recursive: true, filter: (from) => !basename(from).startsWith(".") && basename(from) !== "projections" });
  mkdirSync(join(root, "blueprint/features"), { recursive: true });
  writeFileSync(join(root, "blueprint/features/vault.ts"), `import { Blueprint } from "orthograph";\nimport vault from "@fixture/vault";\n\nexport default Blueprint.use(vault);\n`);
  install(root, variant);
  return root;
};
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));

describe("a fixture feature with its own store, beside acme", () => {
  it("mounts: its store is its own, acme's things and operations are exactly what they were", async () => {
    const alone = await modelOf(acme);
    const beside = await modelOf(project());
    expect(Exit.isSuccess(alone) && Exit.isSuccess(beside)).toBe(true);
    if (!Exit.isSuccess(alone) || !Exit.isSuccess(beside)) return;
    // The fixture: a store named by its mount and path, its thing in it, its operation compiled.
    expect(Object.keys(beside.value.stores ?? {})).toEqual(["vault-ledger"]);
    expect(beside.value.things["line"]).toMatchObject({ lives: "database", store: "vault-ledger" });
    expect(beside.value.operations["line.add"]).toMatchObject({ steps: { save: { type: "database" } } });
    // Acme, unchanged: every thing and operation of acme alone is, hash for hash, what it is beside the fixture.
    for (const [name, thing] of Object.entries(alone.value.things)) expect(beside.value.things[name], name).toEqual(thing);
    for (const [name, operation] of Object.entries(alone.value.operations)) expect(beside.value.operations[name], name).toEqual(operation);
    expect(alone.value).not.toHaveProperty("stores");
    expect(Object.values(alone.value.things).some((t) => "store" in t)).toBe(false);
  });

  it("an operation writing two stores fails to compile, naming the operation, its file and both stores", async () => {
    const exit = await modelOf(project("two-stores"));
    expect(Exit.isFailure(exit)).toBe(true);
    const error = Exit.isFailure(exit) ? exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid) : undefined;
    expect(error).toBeInstanceOf(BlueprintInvalid);
    expect((error as BlueprintInvalid).problems).toEqual([
      "blueprint/features/vault.ts: @fixture/vault/blueprint/things/line/verbs/add.js: line.add writes to two stores (store vault-ledger by step save (line); the default store by step save (memo)): one call commits to one store, so run work across stores as a workflow",
    ]);
  });
});
