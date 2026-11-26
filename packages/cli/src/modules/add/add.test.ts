// `ortho add`: plans with blanks that compile, never overwrites; `check` then names every blank with its line.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Add } from "./service.ts";
import { AddRefused } from "./types.ts";
import { camelField, codeFor, kebabOf, pascalOf, prefixFor } from "./internal/doctype-names.ts";
import { mapFields } from "./internal/doctype-fields.ts";
import type { DocField, Doctype } from "./internal/doctype-read.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const main = resolve(import.meta.dirname, "../../main.ts");
const fresh = join(repo, "examples/acme/test/tmp/add");
const ortho = (...args: ReadonlyArray<string>) => spawnSync("node", [main, ...args, "--root", fresh], { encoding: "utf8" });

afterAll(() => rmSync(fresh, { recursive: true, force: true }));

describe("Add.plan", () => {
  it("a thing is six files in its folder and a values file", () => {
    const planned = Add.plan("thing", "allowance", () => false);
    expect(planned instanceof AddRefused ? planned.message : planned.map((f) => f.path)).toEqual([
      "blueprint/things/allowance/thing.ts", "blueprint/things/allowance/machine.ts", "blueprint/things/allowance/roles.ts",
      "blueprint/things/allowance/events.ts", "blueprint/things/allowance/errors.ts", "blueprint/things/allowance/invariants.ts", "blueprint/values/allowance.ts",
    ]);
  });

  it("an operation, a read and a journey are one file each, where the compiler and prove look", () => {
    const paths = (p: ReturnType<typeof Add.plan>) => (p instanceof AddRefused ? p.message : p.map((f) => f.path));
    expect(paths(Add.plan("operation", "allowance.spend", () => false))).toEqual(["blueprint/things/allowance/verbs/spend.ts"]);
    expect(paths(Add.plan("read", "allowance.get", () => false))).toEqual(["blueprint/things/allowance/verbs/get.ts"]);
    expect(paths(Add.plan("journey", "Spend within an allowance", () => false))).toEqual(["blueprint/journeys/spend-within-an-allowance.ts"]);
  });

  it("refuses a name that doesn't fit, and writes nothing if any file is already there", () => {
    expect(Add.plan("thing", "Allowance", () => false)).toBeInstanceOf(AddRefused);
    expect(Add.plan("operation", "spend", () => false)).toBeInstanceOf(AddRefused);
    const there = Add.plan("thing", "allowance", (p) => p.endsWith("roles.ts"));
    expect(there instanceof AddRefused && there.message).toBe("already there, so nothing was written: blueprint/things/allowance/roles.ts");
  });
});

describe("ortho add, then check, in a fresh project", () => {
  it("writes a thing with 3 blanks that compiles, and check names each with its file and line", { timeout: 120_000 }, () => {
    rmSync(fresh, { recursive: true, force: true });
    mkdirSync(fresh, { recursive: true });
    cpSync(join(repo, "examples/acme/package.json"), join(fresh, "package.json"));
    writeFileSync(join(fresh, "tsconfig.json"), JSON.stringify({ extends: "../../../tsconfig.json", include: ["blueprint/**/*.ts"] }));

    const dry = ortho("add", "thing", "allowance", "--dry-run");
    expect(dry.stdout).toContain("(dry run: 7 files, nothing written)");
    expect(existsSync(join(fresh, "blueprint"))).toBe(false);

    expect(ortho("add", "thing", "allowance").stdout.trim().split("\n")).toHaveLength(7);
    expect(ortho("add", "thing", "allowance").status).toBe(2); // never overwrites

    const tsc = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", fresh, "--noEmit", "--pretty", "false"], { cwd: fresh, encoding: "utf8" });
    expect(tsc.stdout).toBe("");

    const check = ortho("check");
    expect(check.status).toBe(1);
    const lines = check.stdout.trim().split("\n");
    expect(lines[0]).toBe("allowance has 3 blanks");
    const thing = readFileSync(join(fresh, "blueprint/things/allowance/thing.ts"), "utf8").split("\n");
    const at = thing.findIndex((l) => l.includes("Blueprint.todo")) + 1;
    expect(lines).toContain(`  blueprint/things/allowance/thing.ts:${at}  what an allowance is, in one sentence`);

    const model = ortho("model");
    expect(model.status).toBe(0);
    expect(model.stdout).toContain("unfinished allowance  3 blanks");
  });
});

describe("names from a doctype (CX-from-doctype)", () => {
  it("names the folder, the export and a field from ERPNext's names", () => {
    expect([kebabOf("Tea Blend"), pascalOf("Tea Blend"), pascalOf("GL Entry"), camelField("address_line_1")]).toEqual(["tea-blend", "TeaBlend", "GlEntry", "addressLine1"]);
  });

  it("takes initials for a prefix, filled to three from the last word, with an x while one is held", () => {
    const none = new Set<string>();
    expect(["Tea Blend", "Company", "Sales Invoice Item", "Infusion Step"].map((n) => prefixFor(n, none))).toEqual(["tbl", "com", "sii", "ist"]);
    expect(prefixFor("Tea Blend Lot", new Set(["tbl"]))).toBe("tblx");
    expect(prefixFor("Tea Menu Entry", new Set(["tme", "tmex"]))).toBe("tmexx");
  });

  it("takes capital initials for a code, the last word's next letter while one is held, and none past four", () => {
    expect([codeFor("Tea Blend", new Set()), codeFor("Infusion", new Set(["IN"])), codeFor("Tea Teapot", new Set(["TT"]))]).toEqual([{ code: "TB" }, { code: "INF" }, { code: "TTE" }]);
    expect(codeFor("Area", new Set())).toEqual({ code: "ARE" });
    expect(codeFor("Tea Teapot", new Set(["TT", "TTE", "TTEA"]))).toEqual({ none: "TTEA" });
  });
});

describe("a doctype's fields (CX-from-doctype)", () => {
  const field = (f: Partial<DocField> & Pick<DocField, "fieldname" | "fieldtype">): DocField => ({ label: undefined, options: "", reqd: false, readOnly: false, virtual: false, default: undefined, precision: undefined, ...f });
  const doctype = (fields: ReadonlyArray<DocField>): Doctype => ({ name: "Tea Cup", description: undefined, table: false, submittable: true, fields, permissions: [], path: "/x/tea_cup.json", file: "tea_cup.json" });
  const map = (fields: ReadonlyArray<DocField>) => mapFields({ doctype: doctype(fields), prefix: "tcu", known: (d) => (d === "Tea Pot" ? { folder: "tea-pot", identifier: "TeaPot" } : undefined), asset: "usdc" });

  it("drops layout, virtual, naming, a submittable's status and amended_from, and a Dynamic Link's doctype field", () => {
    const m = map([
      field({ fieldname: "col", fieldtype: "Column Break" }), field({ fieldname: "v", fieldtype: "Signature", virtual: true }), field({ fieldname: "naming_series", fieldtype: "Select" }),
      field({ fieldname: "status", fieldtype: "Select" }), field({ fieldname: "amended_from", fieldtype: "Link", options: "Tea Cup" }),
      field({ fieldname: "party_type", fieldtype: "Link", options: "DocType" }), field({ fieldname: "party", fieldtype: "Dynamic Link", options: "party_type", reqd: true }),
    ]);
    expect([m.kept.map((k) => k.key), m.unknown, m.links]).toEqual([["party"], [], []]);
  });

  it("makes a link an edge, its own id or the target's name, and refuses a type it doesn't know", () => {
    const m = map([
      field({ fieldname: "pot", fieldtype: "Link", options: "Tea Pot", reqd: true }), field({ fieldname: "again", fieldtype: "Link", options: "Tea Cup" }),
      field({ fieldname: "shop", fieldtype: "Link", options: "Tea Shop", label: "Shop" }), field({ fieldname: "where", fieldtype: "Geolocation" }),
    ]);
    expect(m.kept.map((k) => k.declaration)).toEqual([
      'Blueprint.described(TeaPot.fields.id, "pot")',
      'Blueprint.described(Blueprint.optional(Blueprint.id("tcu")), "again")',
      'Blueprint.described(Blueprint.optional(TeaShopLink), "Shop (a Tea Shop\'s name)")',
    ]);
    expect([m.unknown, [...m.imports.things], [...m.imports.links]]).toEqual([["Tea Cup.where (Geolocation)"], [["tea-pot", "TeaPot"]], [["tea-shop-link", "TeaShopLink"]]]);
  });
});
