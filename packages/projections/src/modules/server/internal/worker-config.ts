// The Worker's configuration and its database, both from the model.
import { Names } from "orthograph/server";
import type { ClockModel, Model, StoreModel, ThingModel } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import { GENERATED, bindingOf, databaseStores, lines } from "#modules/names/service.js";

/** The compatibility date every Worker and test uses: the test pool's workerd accepts dates up to 2026-08-22. */
export const COMPATIBILITY_DATE = "2026-08-01";

/**
 * Each environment whose clock is stepped or scaled, by name: what the world's Durable Objects and the Worker's entry read
 * (`ORTHO_CLOCKS`, M8.06). A real clock, and no clock at all, are the default and are left out, so a blueprint with
 * neither generates what it always did.
 */
export const clocksOf = (model: Model): Readonly<Record<string, ClockModel>> =>
  Object.fromEntries(Object.values(model.environments ?? {}).flatMap((e) => (e.clock !== undefined && e.clock.kind !== "real" ? [[e.name, e.clock] as const] : [])));

export const renderWrangler = (name: string, actors: boolean, stores: ReadonlyArray<StoreModel> = [], clocks: Readonly<Record<string, ClockModel>> = {}): RenderedFile => ({
  path: "generated/server/wrangler.jsonc",
  scaffold: false,
  content: lines(
    GENERATED,
    "// Local only: the database id is a placeholder until a deploy names a real one (stage two).",
    "{",
    `  "name": "${name}",`,
    `  "main": "main.ts",`,
    `  "compatibility_date": "${COMPATIBILITY_DATE}",`,
    `  "compatibility_flags": ["nodejs_compat"],`,
    `  "d1_databases": [`,
    // Each declared database store (K3) is a database of its own (its own placeholder id, so local state is kept apart) with its own migrations folder.
    [`    { "binding": "DB", "database_name": "${name}", "database_id": "00000000-0000-0000-0000-000000000000", "migrations_dir": "migrations" }`,
      ...stores.map((s, i) => `    { "binding": "${bindingOf(s)}", "database_name": "${name}-${s.name}", "database_id": "00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}", "migrations_dir": "migrations/${s.name}" }`)]
      .map((l, i, all) => (i < all.length - 1 ? `${l},` : l)),
    "  ],",
    actors
      ? `  "durable_objects": { "bindings": [{ "name": "WORLD", "class_name": "World" }, { "name": "ACTORS", "class_name": "Actor" }] },`
      : `  "durable_objects": { "bindings": [{ "name": "WORLD", "class_name": "World" }] },`,
    actors
      ? `  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["World", "Actor"] }],`
      : `  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["World"] }],`,
    "  // Where telemetry goes. `ortho prove` and `ortho dev --otlp` set it; unset, nothing is exported.",
    Object.keys(clocks).length === 0
      ? `  "vars": { "OTLP_URL": "" }`
      : [
        "  // Each environment's stepped or scaled clock (K23): the world's Durable Objects and the Worker's entry read it.",
        `  "vars": { "OTLP_URL": "", "${Names.variable("CLOCKS")}": ${JSON.stringify(JSON.stringify(clocks))} }`,
      ],
    "}",
  ),
});

const JOURNAL = `CREATE TABLE "_journal" (
  "seq" INTEGER PRIMARY KEY AUTOINCREMENT,
  "trace" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "move" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "fields" TEXT NOT NULL
);
CREATE INDEX "_journal_trace" ON "_journal" ("trace");
-- Each idempotent call's answer, under its operation, caller and request key, committed with the call itself.
CREATE TABLE "_requests" (
  "key" TEXT PRIMARY KEY,
  "answer" TEXT NOT NULL
);`;

/**
 * One table per thing: a text column per field (each field's wire form), `state` when it has a machine, and the
 * `version` every update is guarded by (D2 #36). A field that is an array or a struct is its JSON text (STO-23).
 */
const tablesOf = (things: ReadonlyArray<ThingModel>) =>
  things.map((t) => {
    const columns = Object.keys(t.fields).map((f) => (f === "id" ? `  "id" TEXT PRIMARY KEY` : `  "${f}" TEXT NOT NULL`));
    // Empty until the thing's first move sets it.
    if (t.machine) columns.push(`  "state" TEXT`);
    columns.push(`  "version" INTEGER NOT NULL DEFAULT 0`);
    // A rule (G5) is one partial unique index too, named after it (`<table>_<rule>`) so two rules over one field keep two: over the rule's key, within its `while` states.
    const ruleIndexes = Object.entries(t.invariants ?? {}).map(([rule, { fields, while: states }]) => {
      const scope = states ? ` WHERE "state" IN (${states.map((s) => `'${s.replaceAll("'", "''")}'`).join(", ")})` : "";
      return `CREATE UNIQUE INDEX "${t.name}_${rule}" ON "${t.name}" (${fields.map((f) => `"${f}"`).join(", ")})${scope};`;
    });
    return [`CREATE TABLE "${t.name}" (\n${columns.join(",\n")}\n);`, ...ruleIndexes].join("\n");
  });

const header = (...extra: ReadonlyArray<string>) => [
  "-- Generated from the blueprint. Do not edit.",
  "-- Stage one rebuilds the local database on every `ortho dev`; migrations between versions arrive in stage three.",
  ...extra,
];

/** The default database's tables: one per thing that lives in the database and in no declared store. Actors keep their own rows. */
export const renderMigration = (model: Model): RenderedFile => ({
  path: "generated/server/migrations/0001_things.sql",
  scaffold: false,
  content: lines(
    header(),
    tablesOf(Object.values(model.things).filter((t) => t.lives === "database" && !t.store)),
    "-- Every event a move emitted, with the trace of the call that made it (language-effect's Journal).",
    JOURNAL,
  ),
});

/** Each declared database store's own migration (K3 item 6): its things, and the journal and request keys its commits write beside them. */
export const renderStoreMigrations = (model: Model): ReadonlyArray<RenderedFile> =>
  databaseStores(model).map((s) => ({
    path: `generated/server/migrations/${s.name}/0001_things.sql`,
    scaffold: false,
    content: lines(
      header(`-- Store ${s.name}: the database that ${bindingOf(s)} is bound to.`),
      tablesOf(Object.values(model.things).filter((t) => t.store === s.name)),
      "-- Every event a move of this store emitted, with the trace of the call that made it.",
      JOURNAL,
    ),
  }));
