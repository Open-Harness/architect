// The Worker's configuration and its database, both from the model.
import { Names } from "orthograph/server";
import type { ClockModel, FieldModel, Model, StoreModel, ThingModel } from "@orthograph/compiler";
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
 * A field's column, from the form its value encodes to: INTEGER for a boolean (the store binds 1 or 0 and reads a
 * boolean back), TEXT for everything else (ids and amounts as text, a list, a struct, a union or an unknown as its JSON).
 * A field that may have no value, optional or nullable, is a column that may be NULL; any other is NOT NULL.
 */
const columnOf = (field: FieldModel): string => `${field.value.type === "schema" && field.value.format === "bool" ? "INTEGER" : "TEXT"}${field.optional === true || field.nullable === true ? "" : " NOT NULL"}`;

/**
 * One table per thing: a column per field (see `columnOf`), `state` when it has a machine, and the
 * `version` every update is guarded by (D2 #36). A field that is an array or a struct is its JSON text (STO-23).
 */
const tablesOf = (things: ReadonlyArray<ThingModel>) =>
  things.map((t) => {
    const columns = Object.entries(t.fields).map(([f, field]) => (f === "id" ? `  "id" TEXT PRIMARY KEY` : `  "${f}" ${columnOf(field)}`));
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

/** A door-enabled app's journal is also its inbox: each accepted delivery is a row with a unique `id` (`<mount>:<the event's identity>`) and the account that sent it. */
const INBOX = `-- The inbox (M5-reach-out Q2.3): an accepted delivery is one row, by a unique id, so a delivery that comes twice settles once.
ALTER TABLE "_journal" ADD COLUMN "id" TEXT;
ALTER TABLE "_journal" ADD COLUMN "actor" TEXT;
CREATE UNIQUE INDEX "_journal_id" ON "_journal" ("id");`;

/**
 * The event outbox (M5-reach-out Q1, GOAL17-pause): a row per declared hop, written in the commit that journals its event. `to` is `op:<operation>`; `seq`
 * is the journal's, which orders a subject's rows. `hold` is what a hold keys on (the superagent whose pause parks the row) and `hold_by` the hold's name;
 * a test's park (`outbox.hold`) is `hold_by = 'test'`, and a rule in `_outbox_rules` parks the future rows of an event. A row's `claim` is the token of the
 * drain that holds it, and its `due` is the claim's lease while it is claimed. `_stats` counts the commits that lost their race.
 */
const OUTBOX = `CREATE TABLE "_outbox" (
  "event" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "seq" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "trace" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "claim" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "due" INTEGER NOT NULL,
  "hold" TEXT,
  "hold_by" TEXT,
  "outcome" TEXT,
  PRIMARY KEY ("event", "to")
);
CREATE INDEX "_outbox_order" ON "_outbox" ("to", "subject", "seq");
CREATE INDEX "_outbox_due" ON "_outbox" ("state", "due");
CREATE TABLE "_outbox_rules" ("hold" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "to" TEXT NOT NULL);
CREATE TABLE "_stats" ("key" TEXT PRIMARY KEY, "n" INTEGER NOT NULL);`;

/** Every hop the model declares, by the event's name: each operation's `on` list (a mount's hops are in it too). */
export const hopsOf = (model: Model): ReadonlyMap<string, ReadonlyArray<{ readonly to: string; readonly hold?: { readonly by: string; readonly field: string } }>> => {
  const held = Object.entries(model.holds ?? {}).flatMap(([by, h]) => h.held.flatMap((d) => (d.field === undefined ? [] : [{ by, event: d.event, to: d.to, field: d.field }])));
  const table = new Map<string, Array<{ to: string; hold?: { by: string; field: string } }>>();
  for (const o of Object.values(model.operations)) {
    for (const on of o.on ?? []) {
      const hold = held.find((h) => h.event === on.event && h.to === o.name);
      const rows = table.get(on.event) ?? [];
      if (!rows.some((r) => r.to === `op:${o.name}`)) rows.push({ to: `op:${o.name}`, ...(hold === undefined ? {} : { hold: { by: hold.by, field: hold.field } }) });
      table.set(on.event, rows);
    }
  }
  return table;
};

export const hasHops = (model: Model): boolean => hopsOf(model).size > 0;

/** A hold's view of the table of the thing it holds: the keys of the instances whose state switches it on. A held row is parked while its key is in it. */
const holdViews = (model: Model, store: string | undefined) =>
  Object.entries(model.holds ?? {}).flatMap(([name, h]) => {
    const thing = model.things[h.thing];
    if (thing === undefined || thing.store !== store || thing.lives !== "database") return [];
    return [`CREATE VIEW "_hold_${name}" AS SELECT "${h.key}" AS "key" FROM "${thing.name}" WHERE "state" IN (${h.while.map((s) => `'${s.replaceAll("'", "''")}'`).join(", ")});`];
  });

export const hasDoors = (model: Model): boolean => Object.values(model.mounts ?? {}).some((m) => m.door !== undefined);

/** The default database's tables: one per thing that lives in the database and in no declared store. Actors keep their own rows. */
export const renderMigration = (model: Model): RenderedFile => ({
  path: "generated/server/migrations/0001_things.sql",
  scaffold: false,
  content: lines(
    header(),
    tablesOf(Object.values(model.things).filter((t) => t.lives === "database" && !t.store)),
    "-- Every event a move emitted, with the trace of the call that made it (language-effect's Journal).",
    JOURNAL,
    hasDoors(model) ? INBOX : [],
    hasHops(model) ? ["-- The outbox: a row per declared hop of each event, written with the event.", OUTBOX, ...holdViews(model, undefined)] : [],
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
      hasHops(model) ? ["-- The outbox of this store.", OUTBOX, ...holdViews(model, s.name)] : [],
    ),
  }));
