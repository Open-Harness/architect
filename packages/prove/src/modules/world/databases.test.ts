// Which databases a world migrates: the default, and each declared store's own (K3, M1.17).
import { describe, expect, it } from "vitest";
import { databasesOf } from "./internal/wrangler.ts";

const jsonc = (...entries: ReadonlyArray<string>) => `// Generated from the blueprint. Do not edit.
{
  "name": "acme",
  "d1_databases": [
${entries.map((e) => `    ${e}`).join(",\n")}
  ],
  "durable_objects": { "bindings": [{ "name": "WORLD", "class_name": "World" }] }
}
`;
const db = (binding: string, dir: string) => `{ "binding": "${binding}", "database_name": "acme", "database_id": "00000000-0000-0000-0000-000000000000", "migrations_dir": "${dir}" }`;

describe("databasesOf", () => {
  it("is the one default database when no store is declared", () => {
    expect(databasesOf(jsonc(db("DB", "migrations")))).toEqual(["DB"]);
  });

  it("is the default and each store's own, in the order the config lists them, and not a durable object's binding", () => {
    expect(databasesOf(jsonc(db("DB", "migrations"), db("DB_VAULT_LEDGER", "migrations/vault-ledger"), db("DB_LEDGER", "migrations/ledger")))).toEqual(["DB", "DB_VAULT_LEDGER", "DB_LEDGER"]);
  });

  it("is nothing for a config with no database, and the caller falls back to the default", () => {
    expect(databasesOf(`{ "name": "x", "durable_objects": { "bindings": [{ "name": "WORLD" }] } }`)).toEqual([]);
  });
});
