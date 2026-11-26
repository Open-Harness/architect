// Collisions (CX-from-doctype): an id prefix or a refusal code already taken, by a thing from an earlier run or by
// another thing of the same run. The compiler doesn't refuse two things sharing an id prefix, so only these checks
// stand between a scaffold and two kinds of id that mix. Tea Blend Lot after Tea Blend takes `tblx`; Tea Tray's Tea
// Teapot, beside the tray's TT, takes TTE; with TTE and TTEA held already, no code of four letters is left, and the
// run is refused.
import { cpSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { cleanup, doctype, fixtures, generated, model, project, refused, scaffolds, thingOf } from "./support.ts";

afterAll(cleanup);

describe("CX-from-doctype 09: collisions", () => {
  it("lengthens an id prefix a thing from an earlier run holds: Tea Blend Lot after Tea Blend is tblx", () => {
    const root = project();
    scaffolds(root, doctype("tea_blend"), "--asset", "usdc");
    scaffolds(root, doctype("tea_blend_lot"));
    const m = model(root);
    expect(thingOf(m, "tea-blend").fields["id"]?.value).toEqual({ type: "id", prefix: "tbl" });
    expect(thingOf(m, "tea-blend-lot").fields["id"]?.value).toEqual({ type: "id", prefix: "tblx" });
    expect([thingOf(m, "tea-blend").code, thingOf(m, "tea-blend-lot").code]).toEqual(["TB", "TBL"]);
  });

  it("lengthens a refusal code another thing of the same run takes: Tea Teapot, beside Tea Tray's TT, is TTE", () => {
    const root = project();
    scaffolds(root, doctype("tea_tray"));
    const m = model(root);
    expect([thingOf(m, "tea-tray").code, thingOf(m, "tea-teapot").code]).toEqual(["TT", "TTE"]);
    expect([thingOf(m, "tea-tray").fields["id"]?.value, thingOf(m, "tea-teapot").fields["id"]?.value]).toEqual([
      { type: "id", prefix: "ttr" },
      { type: "id", prefix: "tte" },
    ]);
    generated(root);
  });

  it("refuses a record type when every code up to four letters is taken, naming it", () => {
    const root = project();
    cpSync(join(fixtures, "codes-taken"), root, { recursive: true });
    refused(root, ["Tea Teapot", "TTEA"], doctype("tea_tray"));
  });
});
