// What the command refuses (CX-from-doctype): each exits 2, names what is wrong, and writes nothing. A field type it
// doesn't know, in the doctype or in its table; a table whose file isn't there; Currency fields with no asset, or an
// asset that isn't there; a name given beside --from-doctype; and a line already in the project.
import { afterAll, describe, expect, it } from "vitest";
import { ortho } from "../layer1/support.ts";
import { cleanup, doctype, nested, project, refused, scaffolds } from "./support.ts";

afterAll(cleanup);

describe("CX-from-doctype 05: refusals", () => {
  it("refuses a field type it doesn't know, naming every one, in the doctype and in its table", () => {
    const ran = refused(project(), ["Tea Tasting.signature (Signature)", "Tea Tasting Note.place (Geolocation)"], doctype("tea_tasting"));
    for (const known of ["taster", "remark"]) expect(ran.out, `${known} is a Data field, which it knows`).not.toContain(`.${known} (`);
  });

  it("refuses a table whose doctype file is in neither place it looks, naming the table and both paths", () => {
    refused(project(), ["slots", "Tea Crate Slot", "doctypes/tea_crate_slot.json", "tea_crate_slot/tea_crate_slot.json"], doctype("tea_crate"));
  });

  it("refuses Currency fields with no --asset, naming them and the flag, and not a virtual one it drops anyway", () => {
    const ran = refused(project(), ["--asset", "price"], doctype("tea_blend"));
    expect(ran.out).not.toContain("display_price");
  });

  it("refuses an --asset that isn't in blueprint/assets", () => {
    refused(project(), ["blueprint/assets/nope.ts"], doctype("tea_blend"), "--asset", "nope");
  });

  it("refuses a name given beside --from-doctype: the name is the doctype's", () => {
    const root = project();
    refused(root, ["--from-doctype"], doctype("tea_blend"), "tea-blend", "--asset", "usdc");
  });

  it("refuses a line already in the project, naming it: a table shared by two parents is a modelling call", () => {
    const root = project();
    const made = ortho(root, "add", "thing", "tea-menu-entry");
    expect(made.status, made.stdout + made.stderr).toBe(0);
    refused(root, ["tea-menu-entry"], nested("tea_menu"), "--asset", "usdc");
  });

  it("still scaffolds the doctype a refusal turned away, once what was wrong is put right", () => {
    const root = project();
    refused(root, ["--asset"], doctype("tea_blend"));
    scaffolds(root, doctype("tea_blend"), "--asset", "usdc");
  });
});
