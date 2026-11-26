// #1133 (CX-feature-contracts): what the compiler refuses about contracts, each naming the files it is about, and so both features. A required
// contract must be filled; a contract takes one filler; a fill's shape and errors are its contract's; only the owner and a feature that depends
// on it (directly or through another feature it needs) run or fill a contract. An installed feature that isn't mounted is never read, so what it
// would fill can't be refused either. What the model holds is contracts.test.ts; the scratch features are ./fixtures/contracts/testing.ts. Written by the
// checks author for Goal 16; the builder never edits this file and only removes lines from `expected-failing/contracts-refused.txt`.
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { MOUNTED, RIGHT, at, features, modelExit, operationStep, problemsOf, vaultFiles, type AppSpec, type Change, type Contracts, type Owners } from "./fixtures/contracts/testing.ts";

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
    // chart-us is installed, not mounted: the ledger's two required contracts have no filler, the one an operation runs and the one none does.
    const said = await refused({}, { mounts: without("chart-us") }, ["ledger.account-code", at("ledger", "contracts/account-code.js")]);
    expect(said, "it says to mount a feature that fills it").toMatch(/mount/i);
    await refused({}, { mounts: without("chart-us") }, ["ledger.close-period", at("ledger", "contracts/close-period.js")]);
    // The same app with both optional contracts unfilled too is refused for the required ones only, each once.
    const problems = problemsOf(await modelExit(features(), { mounts: without("chart-us", "budgets", "payroll-tax-us") }));
    const named = problems.filter((p) => p.includes("contracts/"));
    expect(named, problems.join("\n")).toHaveLength(2);
    expect(named.filter((p) => p.includes("ledger.account-code")), problems.join("\n")).toHaveLength(1);
    expect(named.filter((p) => p.includes("ledger.close-period")), problems.join("\n")).toHaveLength(1);
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
    // A field is compared whole (CX-feature-contracts call 8): one the fill makes optional differs, and so does the same value declared from
    // no field, where the contract's is the slip's country.
    await refused(input((o) => ({ slip: o.Slip.fields.id, gross: o.Slip.fields.gross, country: Blueprint.optional(o.Country) })), { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "country"]);
    await refused(input((o) => ({ slip: o.Slip.fields.id, gross: o.Slip.fields.gross, country: o.Country })), { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "country"]);
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
    // Another contract's error, of the ledger: a fill refuses with its own contract's errors only.
    await refused({ fills: { "payroll-tax-us": (s, o) => ({ ...RIGHT["payroll-tax-us"](s, o), errors: [o.TaxTableMissing, o.CodeTaken] }) } }, { mounts: MOUNTED }, [TAX_FILL, TAX_CONTRACT, "CodeTaken"]);
  });

  // Who may run or fill a contract is judged whole, pair by pair, in contracts-touch.test.ts.

  it("refuses a contract step where no commit is: on an operation that runs on the caller's device, and on one of a chain-stored thing, word for word", async () => {
    const device: Change = {
      extra: {
        payroll: (s, o) => [{
          path: "things/slip/verbs/preview.js",
          exports: { default: Blueprint.operation(o.Slip, { description: "Preview a slip's tax on the device.", payload: { slip: o.Slip.fields.id, gross: o.Slip.fields.gross, country: o.Slip.fields.country }, answer: {}, runs: "client", allowed: [Blueprint.anyone], steps: { tax: s.step(o.slipTax) } }) },
        }],
      },
    };
    expect(problemsOf(await modelExit(features(device), { mounts: MOUNTED }))).toEqual([
      `blueprint/features/payroll.ts: ${at("payroll", "things/slip/verbs/preview.js")}: a client operation can't run a contract: it has no store and no commit for a filler to join`,
    ]);
    const chain: Change = { extra: { payroll: (s, o) => vaultFiles(o, "payroll", { tax: s.step(o.slipTax) }) } };
    expect(problemsOf(await modelExit(features(chain), { mounts: MOUNTED }))).toEqual([
      `blueprint/features/payroll.ts: ${at("payroll", "things/vault/verbs/open.js")}: vault.open declares the contract step tax: an operation of a chain-stored thing reaches only its own store and the account adapter, so it has no contract step`,
    ]);
  });

  it("refuses a fill that writes a thing in a chain store, or holds a call, contract or wait step, word for word", async () => {
    // A chain store and a thing in it, payroll-tax-us's own, that its fill writes.
    const chainWrite: Change = {
      extra: { "payroll-tax-us": (_s, o) => vaultFiles(o, "payroll-tax-us") },
      fills: { "payroll-tax-us": (s, o) => ({ ...RIGHT["payroll-tax-us"](s, o), steps: { keep: Blueprint.step.database({ writes: [o.vaults["payroll-tax-us"].Vault] }) } }) },
    };
    const exit = await modelExit(features(chainWrite), { mounts: MOUNTED });
    expect(problemsOf(exit)).toEqual([
      `blueprint/features/payroll-tax-us.ts: ${TAX_FILL}: the fill payroll-tax-us.slip-tax writes vault, which lives in a chain store: a fill runs inside its caller's commit, so it writes only things in a database`,
    ]);
    for (const [type, step] of [["call", (_s: Contracts, _o: Owners) => Blueprint.step.call(Blueprint.call())], ["contract", (s: Contracts, o: Owners) => s.step(o.postingCheck)], ["wait", () => Blueprint.step.wait()]] as const) {
      const change: Change = { fills: { "payroll-tax-us": (s, o) => ({ ...RIGHT["payroll-tax-us"](s, o), steps: { more: step(s, o) } }) } };
      expect(problemsOf(await modelExit(features(change), { mounts: MOUNTED })), type).toEqual([
        `blueprint/features/payroll-tax-us.ts: ${TAX_FILL}: the fill payroll-tax-us.slip-tax declares the ${type} step more: a fill holds only database and operation steps`,
      ]);
    }
  });

  it("refuses a fill that writes the contract owner's thing, or its caller's, with CX-feature-ownership call 6's sentence, word for word", async () => {
    const owners: Change = { fills: { "payroll-tax-us": (s, o) => ({ ...RIGHT["payroll-tax-us"](s, o), steps: { save: Blueprint.step.database({ writes: [o.Slip] }) } }) } };
    expect(problemsOf(await modelExit(features(owners), { mounts: MOUNTED }))).toEqual([
      `blueprint/features/payroll-tax-us.ts: ${TAX_FILL}: the feature payroll-tax-us writes slip in the fill payroll-tax-us.slip-tax (step save), and slip is the feature payroll's: a feature writes only its own things. ` +
        "Run one of payroll's operations that write it inside this commit instead, as a step (Blueprint.step.operation): slip.submit",
    ]);
    // Budgets' fill runs for payment.post, among others, and writes the payment: the caller's thing, payments' own.
    const callers: Change = { fills: { budgets: (s, o) => ({ ...RIGHT.budgets(s, o), steps: { save: Blueprint.step.database({ writes: [o.Payment] }) } }) } };
    expect(problemsOf(await modelExit(features(callers), { mounts: MOUNTED }))).toEqual([
      `blueprint/features/budgets.ts: ${at("budgets", "fills/posting-check.js")}: the feature budgets writes payment in the fill budgets.posting-check (step save), and payment is the feature payments's: a feature writes only its own things. ` +
        "Run one of payments's operations that write it inside this commit instead, as a step (Blueprint.step.operation): payment.post",
    ]);
  });

  it("refuses a fill that runs its own contract again, through an operation step at any depth, naming the path (needs #1079's build)", async () => {
    // payroll-tax-us's fill runs slip.submit, which runs payroll.slip-tax, whose fill is this one.
    const cycle: Change = { fills: { "payroll-tax-us": (s, o) => ({ ...RIGHT["payroll-tax-us"](s, o), steps: { again: operationStep(o.slipSubmit) } }) } };
    expect(problemsOf(await modelExit(features(cycle), { mounts: MOUNTED }))).toEqual([
      `blueprint/features/payroll-tax-us.ts: ${TAX_FILL}: the fill payroll-tax-us.slip-tax runs payroll.slip-tax again, through payroll-tax-us.slip-tax → slip.submit → payroll.slip-tax: a contract never runs itself`,
    ]);
  });

  it("refuses a contract or a fill in the app's own blueprint: only a feature declares or fills one", async () => {
    const f = features();
    const fill = { path: "fills/slip-tax.ts", exports: { default: f.o.s.fill(f.o.slipTax, { description: "The app's own tax.", ...RIGHT["payroll-tax-us"](f.o.s, f.o) }) } };
    const contract = { path: "contracts/bonus.ts", exports: { default: f.o.s.contract({ description: "A bonus.", input: {}, output: {} }) } };
    for (const own of [fill, contract]) {
      const problems = problemsOf(await modelExit(f, { mounts: without("payroll-tax-us"), files: [own] }));
      expect(problems.filter((p) => p.includes(`blueprint/${own.path}`)), problems.join("\n")).toHaveLength(1);
    }
  });

  it("never reads a feature that is installed but not mounted: its wrong fills refuse nothing, and the same ones mounted are refused", async () => {
    const wrong: Change = { extra: { "payroll-tax-gb": (s, o) => [{ path: "fills/posting-check.js", exports: { default: s.fill(o.postingCheck, { description: "Wrong.", input: {}, output: { no: o.Amount } }) } }] } };
    expect(problemsOf(await modelExit(features(wrong), { mounts: MOUNTED })), "nothing unmounted is refused").toEqual([]);
    // The control: mounted, the same packages are refused, so the plants are wrong.
    expect(problemsOf(await modelExit(features(wrong), { mounts: { ...MOUNTED, "payroll-tax-gb": "payroll-tax-gb", calendar: "calendar", rogue: "rogue", reports: "reports" } })).length).toBeGreaterThan(2);
  });
});
