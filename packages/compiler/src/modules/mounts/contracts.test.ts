// #1133 (CX-feature-contracts): a contract one feature declares (`Blueprint.contract`, in its `contracts/`) and another fills
// (`Blueprint.fill`, in its `fills/`) when the app is built. The model holds each contract under `contracts.<owner mount>.<name>`, with its shape,
// its errors, whether it is optional, and the one mounted feature that fills it (or none); an operation that runs it (`Blueprint.step.contract`)
// records the step and lists the contract's errors. An installed feature that isn't mounted fills nothing. What the compiler refuses is
// contracts-refused.test.ts; the scratch features are ./fixtures/contracts/testing.ts. Written by the checks author for Goal 16; the builder never edits
// this file and only removes lines from `expected-failing/contracts.txt`.
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { MOUNTED, at, contractsOf, features, modelOf } from "./fixtures/contracts/testing.ts";

describe("#1133: a contract one feature declares and another fills", () => {
  it("holds each mounted feature's contracts, by owner mount and file name, with the shape of the fields they are declared from", async () => {
    const m = await modelOf(features(), { mounts: MOUNTED });
    const contracts = contractsOf(m);
    expect(Object.keys(contracts ?? {}).sort(), "every mounted feature's contract, and no other").toEqual(["ledger.account-code", "ledger.close-period", "ledger.posting-check", "payroll.slip-tax"]);
    const submit = m.operations["slip.submit"];
    // The contract's input is declared from the same fields as slip.submit's payload, and its output from the same field as its answer's tax.
    expect(contracts?.["payroll.slip-tax"]).toEqual({
      owner: "payroll",
      file: at("payroll", "contracts/slip-tax.js"),
      optional: true,
      input: submit?.payload,
      output: { tax: submit?.answer["tax"] },
      errors: ["TaxTableMissing"],
      filler: { mount: "payroll-tax-us", file: at("payroll-tax-us", "fills/slip-tax.js"), writes: ["tax-line"] },
    });
    // A required contract says so; one with no output field holds an empty output.
    const open = m.operations["account.open"];
    expect(contracts?.["ledger.account-code"]).toEqual({
      owner: "ledger",
      file: at("ledger", "contracts/account-code.js"),
      optional: false,
      input: open?.payload,
      output: { code: open?.answer["code"] },
      errors: ["CodeTaken"],
      filler: { mount: "chart-us", file: at("chart-us", "fills/us-codes.js"), writes: [] },
    });
    // A required contract no operation runs is held, and filled, all the same; one feature may fill two contracts.
    expect(contracts?.["ledger.close-period"]).toEqual({
      owner: "ledger",
      file: at("ledger", "contracts/close-period.js"),
      optional: false,
      input: { account: m.operations["payment.post"]?.payload["account"] },
      output: {},
      errors: [],
      filler: { mount: "chart-us", file: at("chart-us", "fills/close.js"), writes: [] },
    });
    const post = m.operations["payment.post"];
    expect(contracts?.["ledger.posting-check"]).toEqual({
      owner: "ledger",
      file: at("ledger", "contracts/posting-check.js"),
      optional: true,
      input: post?.payload,
      output: {},
      errors: ["BudgetExceeded"],
      // Budgets needs payments, not the ledger: depending on the owner through another feature is enough to fill its contract.
      filler: { mount: "budgets", file: at("budgets", "fills/posting-check.js"), writes: [] },
    });
  });

  it("records an operation's contract step, and lists the contract's errors among the operation's, for the owner and for a feature that depends on it", async () => {
    const m = await modelOf(features(), { mounts: MOUNTED });
    expect(m.operations["slip.submit"]?.steps["tax"]).toEqual({ name: "slip.submit.tax", type: "contract", contract: "payroll.slip-tax" });
    expect(m.operations["slip.submit"]?.steps["save"], "the operation's other steps are as they were").toEqual({ name: "slip.submit.save", type: "database" });
    expect(m.operations["account.open"]?.steps["code"]).toEqual({ name: "account.open.code", type: "contract", contract: "ledger.account-code" });
    // payments isn't the ledger: it runs the ledger's check because it depends on the ledger.
    expect(m.operations["payment.post"]?.steps["check"]).toEqual({ name: "payment.post.check", type: "contract", contract: "ledger.posting-check" });
    // Three needs away: payroll-tax-us needs payroll, which needs payments, which needs the ledger. It doesn't declare the check's error itself.
    expect(m.operations["tax-line.check"]?.steps["check"]).toEqual({ name: "tax-line.check.check", type: "contract", contract: "ledger.posting-check" });
    for (const [op, error] of [["slip.submit", "TaxTableMissing"], ["account.open", "CodeTaken"], ["payment.post", "BudgetExceeded"], ["tax-line.check", "BudgetExceeded"]] as const) {
      const errors = m.operations[op]?.errors ?? [];
      expect(errors, `${op} lists ${error}`).toContain(error);
      expect(errors.filter((e) => e === error), `${op} lists ${error} once`).toHaveLength(1);
    }
    // A contract's errors are its runners' only: an operation lists no error of a contract it doesn't run.
    for (const [op, others] of [["slip.submit", ["CodeTaken", "BudgetExceeded"]], ["account.open", ["TaxTableMissing", "BudgetExceeded"]], ["payment.post", ["TaxTableMissing", "CodeTaken"]], ["tax-line.check", ["TaxTableMissing", "CodeTaken"]]] as const) {
      for (const error of others) expect(m.operations[op]?.errors ?? [], `${op} doesn't list ${error}`).not.toContain(error);
    }
  });

  it("with no feature filling an optional contract, the app builds, the contract has no filler, and its operation still runs the step and lists its errors", async () => {
    const without = { ...MOUNTED };
    delete (without as Record<string, string>)["payroll-tax-us"];
    delete (without as Record<string, string>)["budgets"];
    const m = await modelOf(features(), { mounts: without });
    const contracts = contractsOf(m);
    expect(contracts?.["payroll.slip-tax"]?.filler, "no tax feature fills the tax on a slip").toBeNull();
    expect(contracts?.["ledger.posting-check"]?.filler, "no budgets, no check").toBeNull();
    expect(contracts?.["payroll.slip-tax"]?.optional).toBe(true);
    expect(m.operations["slip.submit"]?.steps["tax"]).toEqual({ name: "slip.submit.tax", type: "contract", contract: "payroll.slip-tax" });
    expect(m.operations["slip.submit"]?.errors).toContain("TaxTableMissing");
    expect(m.operations["payment.post"]?.errors).toContain("BudgetExceeded");
    // The installed tax feature is never read: nothing in the model names it or its thing.
    const text = JSON.stringify(m);
    for (const word of ["payroll-tax-us", "tax-line", "@fixture/budgets"]) expect(text, word).not.toContain(word);
  });

  it("names a contract by its owner's mount and its filler by the filler's: a feature mounted under another name renames both, and what the fill writes", async () => {
    const m = await modelOf(features(), { mounts: { ledger: "ledger", payments: "payments", budgets: "budgets", "chart-us": "chart-us", pay: "payroll", tax: "payroll-tax-us" } });
    const contracts = contractsOf(m);
    expect(Object.keys(contracts ?? {}).sort()).toEqual(["ledger.account-code", "ledger.close-period", "ledger.posting-check", "pay.slip-tax"]);
    expect(contracts?.["pay.slip-tax"]).toMatchObject({ owner: "pay", file: at("payroll", "contracts/slip-tax.js"), filler: { mount: "tax", file: at("payroll-tax-us", "fills/slip-tax.js"), writes: ["tax-tax-line"] } });
    expect(m.operations["pay-slip.submit"]?.steps["tax"]).toEqual({ name: "pay-slip.submit.tax", type: "contract", contract: "pay.slip-tax" });
  });

  it("lets the app's own operation run a mounted feature's contract: the app depends on every feature it mounts", async () => {
    const f = features();
    const { s } = f.o;
    const o = f.o;
    const Cheque = Blueprint.thing({ description: "A cheque the app writes.", fields: { id: Blueprint.id("chq"), account: o.Account.fields.id, amount: o.Amount }, code: "CQ" });
    const write = Blueprint.operation(Cheque, {
      description: "Write a cheque, checked against the budget.",
      payload: { account: o.Account.fields.id, amount: o.Amount },
      answer: { cheque: Cheque.fields.id },
      allowed: [Blueprint.signedIn],
      steps: { check: s.step(o.postingCheck), save: Blueprint.step.database() },
    });
    const m = await modelOf(f, { mounts: MOUNTED, files: [{ path: "things/cheque/thing.ts", exports: { Cheque } }, { path: "things/cheque/verbs/write.ts", exports: { default: write } }] });
    expect(m.operations["cheque.write"]?.steps["check"]).toEqual({ name: "cheque.write.check", type: "contract", contract: "ledger.posting-check" });
    expect(m.operations["cheque.write"]?.errors).toContain("BudgetExceeded");
  });

  it("never reads a fill in an installed feature that isn't mounted, wrong or not: the mounted filler is the only one", async () => {
    // The second UK filler and the rogue one are installed and fill payroll's contract; neither is mounted.
    const m = await modelOf(features(), { mounts: MOUNTED });
    expect(contractsOf(m)?.["payroll.slip-tax"]?.filler?.mount).toBe("payroll-tax-us");
    const text = JSON.stringify(m);
    for (const word of ["payroll-tax-gb", "@fixture/rogue", "@fixture/reports", "@fixture/calendar"]) expect(text, word).not.toContain(word);
  });
});
