import { Cause } from "effect";
import { describe, expect, it } from "vitest";
import { defectAttributes, defectTag } from "./defect.ts";

class Unreachable extends Error { readonly _tag = "LedgerUnreachable"; }
class Plain extends Error {}

describe("defectAttributes", () => {
  it("the first line of the cause stays, and the tag is the error's `_tag`", () => {
    expect(defectAttributes(Cause.die(new Unreachable("the ledger is unreachable\nsecond line")))).toEqual({ defect: expect.stringContaining("the ledger is unreachable") as string, "error.tag": "LedgerUnreachable" });
  });

  it("without a `_tag`, the constructor's name; for what is not an error at all, `Error`", () => {
    expect(defectAttributes(Cause.die(new Plain("x")))["error.tag"]).toBe("Plain");
    expect(defectAttributes(Cause.die(new Error("x")))["error.tag"]).toBe("Error");
    expect(defectAttributes(Cause.die("a string"))["error.tag"]).toBe("Error");
    expect(defectAttributes(Cause.die({ plain: true }))["error.tag"]).toBe("Error");
  });
});

describe("defectTag", () => {
  it("is the tag alone", () => {
    expect(defectTag(Cause.die(new Unreachable("x")))).toEqual({ "error.tag": "LedgerUnreachable" });
  });
});
