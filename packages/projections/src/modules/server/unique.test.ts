// The DDL's half (S-04, respelled from G4's `unique` view onto G5's `invariants` view at ST1.20): the migration the server projection generates makes a partial
// unique index for a rule, so the store enforces it at commit (a hand-written index in a host test would prove nothing about what a project actually gets).
// The model is acme's with `invariants` set on one thing, in the shape the model carries: `invariants.<rule> = { kind: "unique", fields, while }`, the index named `<table>_<rule>`.
// Written by the checks author; the builder never edits this file.
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { renderMigration } from "./internal/worker-config.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), join(repo, "examples/acme")], { encoding: "utf8" })) as Model;
const withRule = (rule: { readonly while: ReadonlyArray<string> }): Model => ({
  ...model,
  things: { ...model.things, allowance: { ...model.things["allowance"]!, invariants: { oneAllowancePerMember: { kind: "unique", fields: ["member"], ...rule } } } as never },
});
const sqlOf = (m: Model) => renderMigration(m).content;

describe("control: the migration today", () => {
  it("makes a table for allowance, with its state column, and no unique index when no rule is declared", () => {
    const sql = sqlOf(model);
    expect(sql).toMatch(/CREATE TABLE "allowance"/);
    expect(sql).not.toMatch(/UNIQUE INDEX/i);
  });
});

describe("the generated migration enforces a rule (G5)", () => {
  it("makes a partial unique index named for the rule, over its key, scoped to the states in `while`", () => {
    const sql = sqlOf(withRule({ while: ["active"] }));
    expect(sql).toMatch(/CREATE UNIQUE INDEX\s+"allowance_oneAllowancePerMember"\s+ON\s+"allowance"\s*\(\s*"member"\s*\)\s*WHERE\s+"state"\s+IN\s*\(\s*'active'\s*\)\s*;/i);
  });

  it("scopes to every state listed, and names no state outside them", () => {
    const sql = sqlOf(withRule({ while: ["active", "exhausted"] }));
    expect(sql).toMatch(/UNIQUE INDEX[^;]*"member"[^;]*WHERE\s+"state"\s+IN\s*\(\s*'active'\s*,\s*'exhausted'\s*\)/i);
    expect(sql.match(/UNIQUE INDEX[^;]*;/i)?.[0]).not.toMatch(/revoked/);
  });
});
