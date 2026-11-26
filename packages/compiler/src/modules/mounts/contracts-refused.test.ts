// #1133 (CX-feature-contracts): what the compiler refuses about contracts, each naming the files it is about, and so both features. A required
// contract must be filled; a contract takes one filler; a fill's shape and errors are its contract's; only the owner and a feature that depends
// on it (directly or through another feature it needs) run or fill a contract. An installed feature that isn't mounted is never read, so what it
// would fill can't be refused either. What the model holds is contracts.test.ts; the scratch features are ./fixtures/contracts/testing.ts. Written by the
// checks author for Goal 16; the builder never edits this file and only removes lines from `expected-failing/contracts-refused.txt`.
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { MOUNTED, RIGHT, at, features, modelExit, problemsOf, type AppSpec, type Change } from "./fixtures/contracts/testing.ts";

/** A package's name, and not one that starts with it (`@fixture/payroll`, never `@fixture/payroll-tax-us`). */
const pkg = (name: string) => new RegExp(`${name.replace("/", "\\/")}(?![\\w-])`);

/** The one problem naming every one of `names`: a refusal must name each file it is about. A package is matched as a whole name, never as the start of a longer one. */
const refused = async (change: Change, app: AppSpec, names: ReadonlyArray<string | RegExp>) => {
  const problems = problemsOf(await modelExit(features(change), app));
  expect(problems.length, "the blueprint is refused").toBeGreaterThan(0);
  const named = problems.filter((p) => names.every((n) => (typeof n === "string" ? p.includes(n) : n.test(p))));
  expect(named, `one problem names ${names.join(", ")}; the problems were:\n${problems.join("\n")}`).toHaveLength(1);
  return named[0]!;
};

const TAX_FILL = at("payroll-tax-us", "fills/slip-tax.js");
const TAX_CONTRACT = at("payroll", "contracts/slip-tax.js");
const without = (...names: ReadonlyArray<string>): AppSpec["mounts"] => Object.fromEntries(Object.entries(MOUNTED).filter(([k]) => !names.includes(k)));

describe("#1133: what the compiler refuses about contracts", () => {
  it("refuses a required contract no mounted feature fills, naming the contract and its file; an optional one unfilled is not refused", async () => {
    // chart-us is installed, not mounted: the ledger's required account code has no filler.
    const said = await refused({}, { mounts: without("chart-us") }, ["ledger.account-code", at("ledger", "contracts/account-code.js")]);
    expect(said, "it says how to meet it").toMatch(/fill/i);
    // The same app with both optional contracts unfilled too is refused for the required one only.
    const problems = problemsOf(await modelExit(features(), { mounts: without("chart-us", "budgets", "payroll-tax-us") }));
    expect(problems.filter((p) => p.includes("contracts/")), problems.join("\n")).toEqual([expect.stringContaining("ledger.account-code")]);
  });

  it("refuses two features filling one contract, and one feature filling it twice, naming the contract and both fill files", async () => {
    await refused({}, { mounts: { ...MOUNTED, "payroll-tax-gb": "payroll-tax-gb" } }, ["payroll.slip-tax", TAX_FILL, at("payroll-tax-gb", "fills/slip-tax.js")]);
    const twice: Change = { extra: { "payroll-tax-us": (s, o) => [{ path: "fills/slip-tax-again.js", exports: { default: s.fill(o.slipTax, { description: "Again.", ...RIGHT["payroll-tax-us"](s, o) }) } }] } };
    await refused(twice, { mounts: MOUNTED }, ["payroll.slip-tax", TAX_FILL, at("payroll-tax-us", "fills/slip-tax-again.js")]);
  });

  it("refuses a fill whose input isn't the contract's: a field left out, a field added, a field of another value; naming the fill, the contract and the field", async () => {
    const input = (shape: (o: Parameters<typeof RIGHT["payroll-tax-us"]>[1]) => object): Change => ({ fills: { "payroll-tax-us": (s, o) => ({ ...RIGHT["payroll-tax-us"](s, o), input: shape(o) }) } });
    await refused(input((o) => ({ slip: o.Slip.fields.id, gross: o.Slip.fields.gross })), { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "country"]);
    await refused(input((o) => ({ slip: o.Slip.fields.id, gross: o.Slip.fields.gross, country: o.Slip.fields.country, region: o.Country })), { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "region"]);
    await refused(input((o) => ({ slip: o.Slip.fields.id, gross: Blueprint.value(Blueprint.text({ max: 20 })), country: o.Slip.fields.country })), { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "gross"]);
    // A number of another width is another value too.
    await refused(input((o) => ({ slip: o.Slip.fields.id, gross: Blueprint.value(Blueprint.uint(32)), country: o.Slip.fields.country })), { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "gross"]);
  });

  it("refuses a fill whose output isn't the contract's, or one that declares an error the contract doesn't; naming the fill, the contract and what differs", async () => {
    const output = (shape: (o: Parameters<typeof RIGHT["payroll-tax-us"]>[1]) => object): Change => ({ fills: { "payroll-tax-us": (s, o) => ({ ...RIGHT["payroll-tax-us"](s, o), output: shape(o) }) } });
    await refused(output(() => ({})), { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "tax"]);
    await refused(output((o) => ({ tax: o.Slip.fields.tax, rate: o.Amount })), { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "rate"]);
    await refused(output(() => ({ tax: Blueprint.value(Blueprint.text({ max: 20 })) })), { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "tax"]);
    // An empty output is a shape too: a check that answers something has the wrong one.
    await refused({ fills: { budgets: (s, o) => ({ ...RIGHT.budgets(s, o), output: { ok: Blueprint.value(Blueprint.bool()) } }) } }, { mounts: MOUNTED }, [at("budgets", "fills/posting-check.js"), at("ledger", "contracts/posting-check.js"), "ok"]);
    // payroll-tax-us's own error, which the contract doesn't declare.
    await refused({ fills: { "payroll-tax-us": (s, o) => ({ ...RIGHT["payroll-tax-us"](s, o), errors: [o.TaxTableMissing, o.RateMissing] }) } }, { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "RateMissing"]);
  });

  it("refuses a fill by a feature that doesn't depend on the contract's owner, naming the fill and the owner's package", async () => {
    // The US filler is left out, so the rogue one is the contract's only filler: refused for whom it depends on, not for being a second.
    await refused({}, { mounts: { ...without("payroll-tax-us"), rogue: "rogue" } }, [at("rogue", "fills/slip-tax.js"), pkg("@fixture/payroll")]);
  });

  it("refuses an operation running a contract of a feature its own feature doesn't depend on, naming the operation's file and the owner's package", async () => {
    await refused({}, { mounts: { ...MOUNTED, reports: "reports" } }, [at("reports", "things/report/verbs/run.js"), pkg("@fixture/ledger")]);
  });

  it("never reads a feature that is installed but not mounted: its wrong fills refuse nothing, and the same ones mounted are refused", async () => {
    const wrong: Change = { extra: { "payroll-tax-gb": (s, o) => [{ path: "fills/posting-check.js", exports: { default: s.fill(o.postingCheck, { description: "Wrong.", input: {}, output: { no: o.Amount } }) } }] } };
    expect(problemsOf(await modelExit(features(wrong), { mounts: MOUNTED })), "nothing unmounted is refused").toEqual([]);
    // The control: mounted, the same packages are refused, so the plants are wrong.
    expect(problemsOf(await modelExit(features(wrong), { mounts: { ...MOUNTED, "payroll-tax-gb": "payroll-tax-gb", rogue: "rogue", reports: "reports" } })).length).toBeGreaterThan(2);
  });
});
