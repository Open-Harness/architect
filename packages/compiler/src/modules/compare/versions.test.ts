// D3 #1: versions come from the model diff. An added operation or read is minor; a changed payload, answer or error set is
// major; a budget or docs change is a patch.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "#modules/model/types.js";
import { Compare } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), resolve(repo, "examples/acme")], { encoding: "utf8" })) as Model;
const edited = (edit: (m: { -readonly [K in keyof Model]: any }) => void): Model => {
  const copy = structuredClone(model) as { -readonly [K in keyof Model]: any };
  edit(copy);
  return copy as Model;
};
const spend = (m: { operations: Record<string, any> }) => m.operations["allowance.spend"];

describe("Compare.release", () => {
  it("a new read is minor", () => {
    const after = edited((m) => { m.operations["allowance.list"] = { ...m.operations["allowance.get"], name: "allowance.list", verb: "list", hash: "new" }; });
    expect(Compare.release(model, after)).toEqual({ bump: "minor", changes: [{ kind: "added", what: "allowance.list", bump: "minor" }] });
  });

  it("a looser budget is a patch", () => {
    const after = edited((m) => { spend(m).budget = { p95Ms: 300 }; spend(m).hash = "other"; });
    expect(Compare.release(model, after)).toEqual({ bump: "patch", changes: [{ kind: "changed", what: "allowance.spend.budget", detail: "150ms to 300ms", bump: "patch" }] });
  });

  it("a changed payload, answer or error set is major, and says what changed", () => {
    const payload = edited((m) => { const p = spend(m).payload; delete p.allowance; p.to = p.amount ?? Object.values(p)[0]; spend(m).hash = "x"; });
    const r = Compare.release(model, payload);
    expect(r.bump).toBe("major");
    expect(r.changes[0]).toMatchObject({ kind: "changed", what: "allowance.spend.payload", bump: "major" });
    expect(r.changes[0]!.detail).toContain("to added");
    const answer = edited((m) => { spend(m).answer = { ...spend(m).answer, extra: Object.values(spend(m).answer)[0] }; spend(m).hash = "x"; });
    expect(Compare.release(model, answer).bump).toBe("major");
    const errors = edited((m) => { spend(m).errors = [...spend(m).errors, "SomethingNew"]; spend(m).hash = "x"; });
    expect(Compare.release(model, errors).bump).toBe("major");
  });

  it("a refusal code that shipped never moves: changed or removed is major, a new refusal's code is not a change", () => {
    const moved = edited((m) => { m.refusals["AllowanceNotFound"] = "AL-003"; });
    expect(Compare.release(model, moved)).toEqual({ bump: "major", changes: [{ kind: "changed", what: "refusal:AllowanceNotFound", detail: "AL-002 to AL-003", bump: "major" }] });
    const removed = edited((m) => { delete m.refusals["AllowanceNotFound"]; });
    expect(Compare.release(model, removed).changes).toEqual([{ kind: "removed", what: "refusal:AllowanceNotFound", detail: "AL-002 removed", bump: "major" }]);
    const added = edited((m) => { m.refusals["AllowanceFrozen"] = "AL-004"; });
    expect(Compare.release(model, added)).toEqual({ bump: "patch", changes: [] });
  });

  it("a removed operation is major; the largest change sets the bump", () => {
    const after = edited((m) => {
      delete m.operations["organization.create"];
      m.operations["allowance.list"] = { ...m.operations["allowance.get"], name: "allowance.list", hash: "new" };
    });
    expect(Compare.release(model, after).bump).toBe("major");
  });

  it("nothing changed is still a release, so a patch", () => {
    expect(Compare.release(model, model)).toEqual({ bump: "patch", changes: [] });
  });
});

describe("Compare.next", () => {
  it("is 1.0.0 with no release, and bumps the last one", () => {
    expect(Compare.next(undefined, "minor")).toBe("1.0.0");
    expect(Compare.next("1.0.0", "minor")).toBe("1.1.0");
    expect(Compare.next("1.4.2", "patch")).toBe("1.4.3");
    expect(Compare.next("1.4.2", "major")).toBe("2.0.0");
    expect(Compare.next("1.4.2-next.3", "patch")).toBeUndefined();
  });

  it("a changed asset that a money field counts is major, and says what changed", () => {
    const eur = { name: "eur", file: "blueprint/assets/eur.ts", kind: "currency", code: "EUR", decimals: 2 };
    const withAsset = (asset: object, counted: boolean) => edited((m) => {
      m.assets = { eur: asset };
      m.things = { ...m.things, till: { fields: { cash: { value: { type: "money", bits: 64, signed: false, asset: counted ? { currency: "eur" } : { currency: "other" } } } } } };
    });
    const before = withAsset(eur, true);
    const after = withAsset({ ...eur, code: "JPY", decimals: 0 }, true);
    expect(Compare.release(before, after).changes.find((c) => c.what === "asset:eur")).toEqual({ kind: "changed", what: "asset:eur", detail: 'code "EUR" to "JPY", decimals 2 to 0', bump: "major" });
    expect(Compare.release(before, after).bump).toBe("major");
    expect(Compare.release(before, { ...after, assets: {} } as Model).changes.find((c) => c.what === "asset:eur")).toMatchObject({ kind: "removed", bump: "major" });
    const unused = withAsset(eur, false);
    expect(Compare.release(unused, withAsset({ ...eur, code: "JPY" }, false)).bump).toBe("patch");
    expect(Compare.release(unused, { ...unused, assets: { ...unused.assets, usd: { ...eur, name: "usd", code: "USD" } } } as Model).changes).toEqual([{ kind: "added", what: "asset:usd", bump: "patch" }]);
  });
});
