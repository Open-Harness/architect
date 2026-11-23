// The driver behind M1.17's evidence: acme with the vault fixture feature (tools/fixtures/vault) mounted beside it.
//   pnpm exec tsx tools/evidence/m1-17.mts world    renders it, migrates both databases on workerd and calls both stores
//   pnpm exec tsx tools/evidence/m1-17.mts refuse   compiles it with an operation that writes two stores (exit 1)
// The project is a throwaway copy under .ortho/m1-17 (git-ignored, outside the pnpm workspace) and is removed after.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { dirname, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource, BlueprintInvalid } from "../../packages/compiler/src/index.ts";
import { Render } from "../../packages/generators/src/modules/render/service.ts";
import { Worlds } from "../../packages/prove/src/modules/world/service.ts";

const repo = resolve(import.meta.dirname, "../..");
const acme = join(repo, "examples/acme");
const vault = join(repo, "tools/fixtures/vault");
const root = join(repo, ".ortho/m1-17");
const mode = process.argv[2] === "refuse" ? "refuse" : "world";

const sources = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((e) => (statSync(join(dir, e)).isDirectory() ? sources(join(dir, e)) : e.endsWith(".ts") ? [join(dir, e)] : []));

/** acme, copied; the fixture installed as a package (its TypeScript, types stripped, as .js) and mounted under its own name. */
const build = (variant?: string) => {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const f of ["blueprint", "src", "ortho.config.ts", "tsconfig.json"]) cpSync(join(acme, f), join(root, f), { recursive: true });
  cpSync(join(acme, "node_modules"), join(root, "node_modules"), { recursive: true, verbatimSymlinks: true });
  mkdirSync(join(root, "blueprint/features"), { recursive: true });
  writeFileSync(join(root, "blueprint/features/vault.ts"), `import { Blueprint } from "orthograph";\nimport vault from "@fixture/vault";\n\nexport default Blueprint.use(vault);\n`);
  const plugin = join(root, "node_modules/@fixture/vault");
  for (const from of [join(vault, "source"), ...(variant ? [join(vault, "variants", variant)] : [])]) {
    for (const file of sources(from)) {
      const to = join(plugin, relative(from, file)).replace(/\.ts$/, ".js");
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, stripTypeScriptTypes(readFileSync(file, "utf8")));
    }
  }
  const manifest = JSON.parse(readFileSync(join(vault, "package.json"), "utf8")) as Record<string, unknown>;
  const exports = { ".": "./feature.js", "./blueprint/*": "./blueprint/*", "./src/*": "./src/*" };
  writeFileSync(join(plugin, "package.json"), JSON.stringify({ ...manifest, exports, orthograph: { kind: "feature", blueprint: "./blueprint", src: "./src" } }));
  const own = JSON.parse(readFileSync(join(acme, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  writeFileSync(join(root, "package.json"), JSON.stringify({ ...own, name: "@acme/m1-17", dependencies: { ...own.dependencies, "@fixture/vault": "1.0.0" } }, null, 2));
};

const call = (url: string, path: string, body?: unknown) =>
  Effect.promise(async () => {
    const r = await fetch(`${url}${path}`, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: await r.text() };
  });

/** What a database file holds: its tables, and how many rows of the ones named. */
const inspect = (file: string, tables: ReadonlyArray<string>) => {
  const db = new DatabaseSync(file, { readOnly: true });
  const names = (db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' ORDER BY name`).all() as ReadonlyArray<{ name: string }>).map((r) => r.name);
  const counts = tables.filter((t) => names.includes(t)).map((t) => `${t}=${(db.prepare(`SELECT count(*) AS n FROM "${t}"`).get() as { n: number }).n}`);
  db.close();
  return { tables: names, counts };
};

if (mode === "refuse") {
  build("two-stores");
  const exit = await Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
  rmSync(root, { recursive: true, force: true });
  const error = exit._tag === "Failure" ? exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid) : undefined;
  if (error instanceof BlueprintInvalid) {
    console.log("the blueprint is refused:");
    for (const p of error.problems) console.log(`  ${p}`);
    process.exit(1);
  }
  console.log("compiled: the operation writing two stores was NOT refused");
} else {
  build();
  const model = await Effect.runPromise(Effect.provide(Compiler.model, nodeSource(root)));
  console.log(`stores: ${Object.values(model.stores ?? {}).map((s) => `${s.name} (${s.kind}, from ${s.from?.package ?? "the project"})`).join(", ")}`);
  const files = Render.files({ name: "m1-17", model });
  for (const f of files) {
    const path = join(root, f.path);
    if (f.scaffold && existsSync(path)) continue;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, f.content);
  }
  console.log(`migrations: ${files.filter((f) => f.path.includes("/migrations/")).map((f) => f.path).join(", ")}`);
  const state = join(root, ".ortho/world");
  const program = Effect.scoped(Effect.gen(function* () {
    const world = yield* Worlds.start({ root, port: 0, name: "world" });
    const added = yield* call(world.url, "/line/add", { amount: "5" });
    console.log(`POST /line/add (the vault's store) -> ${added.status} ${added.body}`);
    const line = (JSON.parse(added.body) as { line: string }).line;
    const row = yield* call(world.url, `/_world/facts/record?table=line&id=${line}`);
    console.log(`fact: line row -> ${row.status} ${row.body}`);
    const health = yield* call(world.url, "/system/health", {});
    console.log(`POST /system/health (acme, the default store) -> ${health.status} ${health.body}`);
  }));
  await Effect.runPromise(program);
  const dir = join(state, "v3/d1/miniflare-D1DatabaseObject");
  const found = readdirSync(dir).filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite").map((f) => ({ file: f, ...inspect(join(dir, f), ["line", "allowance", "_journal"]) }));
  console.log(`databases the world made: ${found.length}`);
  for (const d of found) console.log(`  ${d.tables.includes("line") ? "vault-ledger" : "default"}: ${d.tables.join(", ")} | ${d.counts.join(" ")}`);
  rmSync(root, { recursive: true, force: true });
}
