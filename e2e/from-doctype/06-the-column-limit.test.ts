// A record type wider than the host allows (CX-from-doctype). A thing is a D1 table, and D1 allows 100 columns: a
// doctype's are its kept fields plus id, state and version; a line's its fields plus id, parent, idx and version.
// Layout and dropped fields don't count. 97 kept fields fit a doctype and 98 are refused; 96 fit a line and 97 are
// refused. The migration of what fits has exactly 100 columns.
import { afterAll, describe, expect, it } from "vitest";
import { cleanup, columnsOf, doctype, generated, project, refused, scaffolds } from "./support.ts";

afterAll(cleanup);

const entries = (n: number) => Array.from({ length: n }, (_, i) => `entry${String(i + 1).padStart(3, "0")}`);

describe("CX-from-doctype 06: the column limit", () => {
  it("scaffolds a doctype of exactly 100 columns, not counting its layout, virtual and naming_series fields, and the migration holds them", () => {
    const root = project();
    scaffolds(root, doctype("tea_ledger"));
    generated(root);
    expect(columnsOf(root, "tea-ledger")).toEqual(["id", ...entries(97), "state", "version"]);
  });

  it("refuses a doctype of 101 columns, naming it, its count and the limit", () => {
    refused(project(), ["Tea Ledger Wide", "101", "100"], doctype("tea_ledger_wide"));
  });

  it("scaffolds a line of exactly 100 columns: its parent and idx count, and it has no state", () => {
    const root = project();
    scaffolds(root, doctype("tea_shelf"));
    generated(root);
    expect(columnsOf(root, "tea-shelf-slot")).toEqual(["id", "parent", "idx", ...entries(96), "version"]);
  });

  it("refuses a doctype whose table needs 101 columns, naming the line, and writes neither", () => {
    const ran = refused(project(), ["Tea Rack Slot", "101", "100"], doctype("tea_rack"));
    expect(ran.out, "the doctype itself fits; the refusal is the line's").not.toMatch(/Tea Rack needs/);
  });
});
