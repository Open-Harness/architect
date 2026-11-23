// A feature's own store, rendered (K3, M1.17): a database of its own with its own migration, bound beside the default,
// and acme's own files unchanged. Both migrations are run, for real, on SQLite.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { basename, dirname, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Render } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const vault = join(repo, "tools/fixtures/vault");
const scratch = resolve(import.meta.dirname, "../../../.ortho/stores");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const sources = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((entry) => (statSync(join(dir, entry)).isDirectory() ? sources(join(dir, entry)) : entry.endsWith(".ts") ? [join(dir, entry)] : []));

/** acme's blueprint with the fixture feature installed (its TypeScript, types stripped) and mounted under its own name. */
const project = () => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "p-"));
  cpSync(join(acme, "blueprint"), join(root, "blueprint"), { recursive: true, filter: (from) => !basename(from).startsWith(".") && basename(from) !== "projections" });
  // The journeys are part of acme: its docs pages carry them as worked examples (W2).
  cpSync(join(acme, "journeys"), join(root, "journeys"), { recursive: true, filter: (from) => !basename(from).startsWith(".") });
  mkdirSync(join(root, "blueprint/features"), { recursive: true });
  writeFileSync(join(root, "blueprint/features/vault.ts"), `import { Blueprint } from "orthograph";\nimport vault from "@fixture/vault";\n\nexport default Blueprint.use(vault);\n`);
  const plugin = join(root, "node_modules/@fixture/vault");
  for (const file of sources(join(vault, "source"))) {
    const to = join(plugin, relative(join(vault, "source"), file)).replace(/\.ts$/, ".js");
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, stripTypeScriptTypes(readFileSync(file, "utf8")));
  }
  const manifest = JSON.parse(readFileSync(join(vault, "package.json"), "utf8")) as Record<string, unknown>;
  writeFileSync(join(plugin, "package.json"), JSON.stringify({ ...manifest, exports: { ".": "./feature.js" }, orthograph: { kind: "feature", blueprint: "./blueprint" } }));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "acme", version: "0.0.0", type: "module", dependencies: { "@fixture/vault": "1.0.0" } }));
  return root;
};

const render = (project: Parameters<typeof Render.files>[0]) => Effect.runPromise(Render.files(project));
const compile = (root: string) => Effect.runPromise(Effect.provide(Compiler.model, nodeSource(root)));
const rows = (db: DatabaseSync) => db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).all().map((r) => String(r["name"]));

describe("a feature's own store, rendered", () => {
  it("is a database of its own beside the default, and acme's own files are what they were", async () => {
    const alone = new Map((await render({ name: "acme", model: await compile(acme), root: acme })).map((f) => [f.path, f.content]));
    const beside = new Map((await render({ name: "acme", model: await compile(project()) })).map((f) => [f.path, f.content]));
    // The default database: acme's tables, and none of the fixture's.
    expect(beside.get("generated/server/migrations/0001_things.sql")).toBe(alone.get("generated/server/migrations/0001_things.sql"));
    expect(alone.get("generated/server/wrangler.jsonc")).toContain(`"d1_databases": [\n    { "binding": "DB", "database_name": "acme", "database_id": "00000000-0000-0000-0000-000000000000", "migrations_dir": "migrations" }\n  ],`);
    expect(alone.get("generated/server/main.ts")).not.toContain("Store from");
    expect(alone.get("generated/server/main.ts")).toContain("JournalD1.layer, BusyLive");
    expect(alone.get("generated/server/main.ts")).toContain("tables: tables.map(([, table]) => table)");
    // The fixture's: its own binding, its own database id and migrations folder, its own migration.
    const wrangler = beside.get("generated/server/wrangler.jsonc")!;
    expect(wrangler).toContain(`{ "binding": "DB", "database_name": "acme", "database_id": "00000000-0000-0000-0000-000000000000", "migrations_dir": "migrations" },`);
    expect(wrangler).toContain(`{ "binding": "DB_VAULT_LEDGER", "database_name": "acme-vault-ledger", "database_id": "00000000-0000-0000-0000-000000000001", "migrations_dir": "migrations/vault-ledger" }`);
    const main = beside.get("generated/server/main.ts")!;
    expect(main).toContain(`import vaultLedgerStore from "@fixture/vault/blueprint/stores/ledger.js";`);
    expect(main).toContain("readonly DB_VAULT_LEDGER: D1Database;");
    expect(main).toContain(`StoreD1.layer({ tables, stores: [[vaultLedgerStore, env.DB_VAULT_LEDGER]], people: { thing: thingIn(personThing), table: "auth_user" } }), JournalD1.across([env.DB_VAULT_LEDGER])`);
    expect(main).toContain(`stores: [{ db: env.DB_VAULT_LEDGER, tables: ["line"] }]`);
    expect(main).toMatch(/tables: \["allowance", [^\]]*"session"[^\]]*\], stores:/);
    expect(main).not.toMatch(/tables: \[[^\]]*"line"[^\]]*\], stores:/);
    expect(beside.get("generated/docs/line/index.md")).toContain("Lives in the database, in the store vault-ledger.");
    // What acme has per thing and per operation, it still has byte for byte; only what lists everything gains the fixture.
    // acme mounts its projections, so its first lines name the mounts; the copy mounts none. Only that line may differ.
    const body = (text: string | undefined) => text?.replace(/^\/\/ Generated from blueprint\/projections\/[a-z-]+\.ts\./, "// Generated from the blueprint.");
    const changed = [...alone].filter(([path, text]) => body(beside.get(path)) !== body(text)).map(([path]) => path);
    // acme also mounts the actions, which the copy's standing set does not have: its files are acme's alone.
    expect(changed.filter((path) => !path.startsWith("generated/actions/") && /\/(allowance|api-key|invitation|membership|organization|person|session|system)\//.test(path))).toEqual([]);
    expect(changed).not.toContain("generated/server/migrations/0001_things.sql");
  });

  it("both migrate: each migration runs on its own SQLite, the default's with acme's tables and the store's with its own", async () => {
    const files = new Map((await render({ name: "acme", model: await compile(project()) })).map((f) => [f.path, f.content]));
    const home = new DatabaseSync(":memory:");
    home.exec(files.get("generated/server/migrations/0001_things.sql")!);
    const apart = new DatabaseSync(":memory:");
    apart.exec(files.get("generated/server/migrations/vault-ledger/0001_things.sql")!);
    expect(rows(home)).toContain("allowance");
    expect(rows(home)).not.toContain("line");
    expect(rows(apart)).toEqual(["_journal", "_requests", "line", "sqlite_sequence"]);
    // The store's table is the fixture's thing, with the version column its commits are guarded by.
    expect(apart.prepare(`SELECT name FROM pragma_table_info('line') ORDER BY cid`).all()).toEqual([{ name: "id" }, { name: "amount" }, { name: "version" }]);
    expect(files.get("generated/server/migrations/vault-ledger/0001_things.sql")!.split("\n")[0]).toBe("-- Generated from the blueprint. Do not edit.");
  });
});
