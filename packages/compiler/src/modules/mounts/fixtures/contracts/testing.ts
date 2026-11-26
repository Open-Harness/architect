// The scratch features the #1133 compiler checks build (CX-feature-contracts): `payroll` declares an optional contract, the tax on a slip, that
// `payroll-tax-us` fills; `ledger` declares an optional check before a posting that `budgets` fills (through payments, at one remove) and a
// required one, an account's code, that `chart-us` fills. Each is an installed package the app may or may not mount; some are wrong on purpose
// (a second tax filler, one that needs nothing, a report that runs the ledger's check without needing the ledger). Read by contracts.test.ts and
// contracts-refused.test.ts. Written by the checks author for Goal 16; the builder never edits it. It sits in its own folder, so it never
// collides with the `mounts/testing.ts` that #1175 adds.
//
// The contract surface doesn't exist on `main`, so it is reached here through `surface()`, which says what is missing instead of failing to
// load: `Blueprint.contract(spec)` declares a contract, `Blueprint.fill(contract, spec)` fills one, `Blueprint.step.contract(contract)` runs one.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect, Exit, Layer } from "effect";
import { expect } from "vitest";
import { Blueprint, type Feature } from "orthograph";
import { BlueprintSource, type LoadedFile, type PluginPackage } from "#modules/source/types.js";
import { BlueprintInvalid, type Model } from "#modules/model/types.js";
import { Compiler } from "#modules/model/service.js";

export interface Contracts {
  readonly contract: (spec: { readonly description: string; readonly input: object; readonly output: object; readonly errors?: ReadonlyArray<unknown>; readonly optional?: true }) => any;
  readonly fill: (contract: unknown, spec: { readonly description: string; readonly input: object; readonly output: object; readonly errors?: ReadonlyArray<unknown>; readonly steps?: object }) => any;
  readonly step: (contract: unknown) => any;
}

/** The surface #1133 adds, or a failure naming the part that isn't built. */
export const surface = (): Contracts => {
  const bp = Blueprint as unknown as { readonly contract?: unknown; readonly fill?: unknown; readonly step: { readonly contract?: unknown } };
  if (typeof bp.contract !== "function") expect.fail("Blueprint.contract is not built: a feature can't declare a contract (#1133)");
  if (typeof bp.fill !== "function") expect.fail("Blueprint.fill is not built: a feature can't fill another's contract (#1133)");
  if (typeof bp.step.contract !== "function") expect.fail("Blueprint.step.contract is not built: an operation can't run a contract (#1133)");
  return { contract: bp.contract as Contracts["contract"], fill: bp.fill as Contracts["fill"], step: bp.step.contract as Contracts["step"] };
};

/** Every feature package the checks install, by its own name (`@fixture/<name>`). */
export type Name = "ledger" | "payments" | "budgets" | "chart-us" | "payroll" | "payroll-tax-us" | "payroll-tax-gb" | "calendar" | "rogue" | "reports";

/** What one installed package is: its descriptor, and its blueprint files by path under its blueprint folder. */
interface Pkg {
  readonly descriptor: Feature<any>;
  readonly files: ReadonlyArray<LoadedFile>;
}

const file = (path: string, exports: Readonly<Record<string, unknown>>): LoadedFile => ({ path, exports });

/** A fill's spec, for a check to swap: what the declared shape would be, built from what the owners export. */
export type FillSpec = (s: Contracts, o: Owners) => { readonly input: object; readonly output: object; readonly errors?: ReadonlyArray<unknown>; readonly steps?: object };
/** What a check may change: a fill's spec, or a package's extra files (a second fill, say). */
export interface Change {
  readonly fills?: Partial<Record<"payroll-tax-us" | "budgets" | "chart-us", FillSpec>>;
  readonly extra?: Partial<Record<Name, (s: Contracts, o: Owners) => ReadonlyArray<LoadedFile>>>;
}

/** The owners' declarations a filler imports: the contracts, and the values and fields their shapes are made of. */
export const owners = () => {
  const s = surface();
  const Amount = Blueprint.value(Blueprint.uint(64));
  const Country = Blueprint.value(Blueprint.text({ max: 2 }));
  const Code = Blueprint.value(Blueprint.text({ max: 12 }));

  // The ledger: an account has a code the required contract gives it; a posting is checked by the optional one.
  const Account = Blueprint.thing({ description: "A ledger account.", fields: { id: Blueprint.id("acc"), name: Blueprint.value(Blueprint.text({ max: 60 })), code: Code }, code: "AC" });
  class BudgetExceeded extends Blueprint.error({ account: Account.fields.id }, { exit: 61 }) {}
  class CodeTaken extends Blueprint.error({ code: Code }, { exit: 62 }) {}
  const postingCheck = s.contract({
    // Described as the account code is: a fill is matched to its contract by identity, never by what it says.
    description: "A rule of the ledger.",
    input: { account: Account.fields.id, amount: Amount },
    output: {},
    errors: [BudgetExceeded],
    optional: true,
  });
  const accountCode = s.contract({ description: "A rule of the ledger.", input: { name: Account.fields.name }, output: { code: Account.fields.code }, errors: [CodeTaken] });
  // A required contract no operation runs: it must be filled all the same.
  const closePeriod = s.contract({ description: "What closing a period does to an account.", input: { account: Account.fields.id }, output: {} });
  const accountOpen = Blueprint.operation(Account, {
    description: "Open an account, its code from the chart.",
    payload: { name: Account.fields.name },
    answer: { account: Account.fields.id, code: Account.fields.code },
    allowed: [Blueprint.signedIn],
    steps: { code: s.step(accountCode), save: Blueprint.step.database() },
  });

  // Payroll: a slip's tax comes from whatever feature fills its contract, if one does.
  const Slip = Blueprint.thing({ description: "A pay slip.", fields: { id: Blueprint.id("slp"), gross: Amount, country: Country, tax: Amount }, code: "SL" });
  class TaxTableMissing extends Blueprint.error({ country: Country }, { exit: 63 }) {}
  // payroll-tax-us's own error, declared in its things (it is here so a check can plant it in a fill): the contract doesn't declare it.
  class RateMissing extends Blueprint.error({ country: Country }, { exit: 64 }) {}
  const slipTax = s.contract({
    description: "The tax on a slip.",
    input: { slip: Slip.fields.id, gross: Slip.fields.gross, country: Slip.fields.country },
    output: { tax: Slip.fields.tax },
    errors: [TaxTableMissing],
    optional: true,
  });
  // Its payload and answer are declared from the same fields as the contract's input and output: what the checks compare the contract to.
  const slipSubmit = Blueprint.operation(Slip, {
    description: "Submit a slip, taxed by whatever fills the tax contract.",
    payload: { slip: Slip.fields.id, gross: Slip.fields.gross, country: Slip.fields.country },
    answer: { slip: Slip.fields.id, tax: Slip.fields.tax },
    allowed: [Blueprint.signedIn],
    steps: { save: Blueprint.step.database(), tax: s.step(slipTax) },
  });
  return { s, Amount, Country, Code, Account, BudgetExceeded, CodeTaken, postingCheck, accountCode, closePeriod, accountOpen, Slip, TaxTableMissing, slipTax, slipSubmit, RateMissing };
};
export type Owners = ReturnType<typeof owners>;

/** The fills as the right fillers declare them: each the contract's shape, from the owner's own fields. */
export const RIGHT: Required<NonNullable<Change["fills"]>> = {
  "payroll-tax-us": (_s, o) => ({ input: { slip: o.Slip.fields.id, gross: o.Slip.fields.gross, country: o.Slip.fields.country }, output: { tax: o.Slip.fields.tax }, errors: [o.TaxTableMissing] }),
  budgets: (_s, o) => ({ input: { account: o.Account.fields.id, amount: o.Amount }, output: {}, errors: [o.BudgetExceeded] }),
  "chart-us": (_s, o) => ({ input: { name: o.Account.fields.name }, output: { code: o.Account.fields.code } }),
};

/** The features, built fresh. `change` swaps one fill's spec or adds files to a package, so a refusal check plants exactly one wrong declaration. */
export const features = (change: Change = {}) => {
  const o = owners();
  const { s } = o;
  const fillOf = (name: keyof typeof RIGHT, description: string, more: object = {}) => s.fill(name === "payroll-tax-us" ? o.slipTax : name === "budgets" ? o.postingCheck : o.accountCode, { description, ...(change.fills?.[name] ?? RIGHT[name])(s, o), ...more });
  const feature = (description: string, needs: ReadonlyArray<Feature<any>> = []) => Blueprint.feature({ description, ...(needs.length > 0 ? { needs } : {}) });
  const extra = (name: Name) => change.extra?.[name]?.(s, o) ?? [];

  const ledger = feature("The books.");
  const payments = feature("Payments.", [ledger]);
  const payroll = feature("Payroll.", [payments]);

  // payroll-tax-us's own thing, the tax line its fill writes in the caller's commit.
  const TaxLine = Blueprint.thing({ description: "A tax line on a slip.", fields: { id: Blueprint.id("txl"), slip: o.Slip.fields.id, amount: o.Amount }, code: "TL" });
  // Its check runs the ledger's check three needs away (payroll-tax-us, payroll, payments, the ledger), and doesn't declare the check's error.
  const taxLineCheck = Blueprint.operation(TaxLine, {
    description: "Check a tax line's posting.",
    payload: { account: o.Account.fields.id, amount: o.Amount },
    answer: { line: TaxLine.fields.id },
    allowed: [Blueprint.signedIn],
    steps: { check: s.step(o.postingCheck) },
  });
  // A calendar needs nothing. The rogue filler and the reports need it, and nothing else: they have needs, and none reaches the owners.
  const calendar = feature("A calendar.");
  // A report runs the ledger's optional check and its required account code, though it depends on neither owner.
  const Report = Blueprint.thing({ description: "A report.", fields: { id: Blueprint.id("rpt"), account: o.Account.fields.id }, code: "RP" });
  const reportRun = Blueprint.operation(Report, {
    description: "Run a report, checking a posting on the way.",
    payload: { account: o.Account.fields.id, amount: o.Amount },
    answer: { report: Report.fields.id },
    allowed: [Blueprint.signedIn],
    steps: { check: s.step(o.postingCheck) },
  });
  const reportCode = Blueprint.operation(Report, {
    description: "Code a report's account.",
    payload: { name: o.Account.fields.name },
    answer: { report: Report.fields.id },
    allowed: [Blueprint.signedIn],
    steps: { code: s.step(o.accountCode) },
  });

  // A payment runs the ledger's check: payments depends on the ledger, so it may. It declares the check's error itself too (it maps it to its own
  // refusal), so the operation lists it once whether it declares it or the contract brings it.
  const Payment = Blueprint.thing({ description: "A payment.", fields: { id: Blueprint.id("pay"), account: o.Account.fields.id, amount: o.Amount }, code: "PY" });
  const paymentPost = Blueprint.operation(Payment, {
    description: "Post a payment, checked before it lands.",
    payload: { account: o.Account.fields.id, amount: o.Amount },
    answer: { payment: Payment.fields.id },
    errors: [o.BudgetExceeded],
    allowed: [Blueprint.signedIn],
    steps: { check: s.step(o.postingCheck), save: Blueprint.step.database() },
  });

  const pkgs: Record<Name, Pkg> = {
    ledger: {
      descriptor: ledger,
      files: [
        file("things/account/thing.js", { Account: o.Account }),
        file("things/account/errors.js", { BudgetExceeded: o.BudgetExceeded, CodeTaken: o.CodeTaken }),
        file("things/account/verbs/open.js", { default: o.accountOpen }),
        file("contracts/posting-check.js", { default: o.postingCheck }),
        file("contracts/account-code.js", { default: o.accountCode }),
        file("contracts/close-period.js", { default: o.closePeriod }),
        ...extra("ledger"),
      ],
    },
    payments: { descriptor: payments, files: [file("things/payment/thing.js", { Payment }), file("things/payment/verbs/post.js", { default: paymentPost }), ...extra("payments")] },
    // Budgets needs payments, not the ledger: it depends on the ledger through payments.
    budgets: { descriptor: feature("Budgets.", [payments]), files: [file("fills/posting-check.js", { default: fillOf("budgets", "Refuse a posting over budget.") }), ...extra("budgets")] },
    // Its fill's file isn't named after the contract: a fill is matched to its contract by the contract it imports, never by a name.
    "chart-us": { descriptor: feature("The US chart of accounts.", [ledger]), files: [
      file("fills/us-codes.js", { default: fillOf("chart-us", "A US account code.") }),
      // A feature may fill several contracts.
      file("fills/close.js", { default: s.fill(o.closePeriod, { description: "Close a US period.", input: { account: o.Account.fields.id }, output: {} }) }),
      ...extra("chart-us"),
    ] },
    payroll: {
      descriptor: payroll,
      files: [
        file("things/slip/thing.js", { Slip: o.Slip }),
        file("things/slip/errors.js", { TaxTableMissing: o.TaxTableMissing }),
        file("things/slip/verbs/submit.js", { default: o.slipSubmit }),
        file("contracts/slip-tax.js", { default: o.slipTax }),
        ...extra("payroll"),
      ],
    },
    "payroll-tax-us": {
      descriptor: feature("United States payroll tax.", [payroll]),
      files: [
        file("things/tax-line/thing.js", { TaxLine }),
        file("things/tax-line/errors.js", { RateMissing: o.RateMissing }),
        // Depends on the ledger three needs away: payroll-tax-us, payroll, payments, the ledger.
        file("things/tax-line/verbs/check.js", { default: taxLineCheck }),
        file("fills/slip-tax.js", { default: fillOf("payroll-tax-us", "US tax on a slip.", { steps: { save: Blueprint.step.database({ writes: [TaxLine] }) } }) }),
        ...extra("payroll-tax-us"),
      ],
    },
    // A second tax filler, right in shape: mounted beside the US one, the contract has two fillers.
    "payroll-tax-gb": {
      descriptor: feature("United Kingdom payroll tax.", [payroll]),
      files: [file("fills/slip-tax.js", { default: s.fill(o.slipTax, { description: "UK tax on a slip.", ...RIGHT["payroll-tax-us"](s, o) }) }), ...extra("payroll-tax-gb")],
    },
    calendar: { descriptor: calendar, files: [...extra("calendar")] },
    // Fills payroll's contract, right in shape, though it needs only the calendar: it doesn't depend on the contract's owner.
    rogue: { descriptor: feature("Needs the calendar only.", [calendar]), files: [file("fills/slip-tax.js", { default: s.fill(o.slipTax, { description: "Tax from nowhere.", ...RIGHT["payroll-tax-us"](s, o) }) }), ...extra("rogue")] },
    reports: { descriptor: feature("Reports.", [calendar]), files: [file("things/report/thing.js", { Report }), file("things/report/verbs/run.js", { default: reportRun }), file("things/report/verbs/code.js", { default: reportCode }), ...extra("reports")] },
  };
  return { o, pkgs, TaxLine };
};
export type Features = ReturnType<typeof features>;

export interface AppSpec {
  /** Each mount, by its file's name (`blueprint/features/<mount>.ts`), and the package it mounts. */
  readonly mounts: Readonly<Record<string, Name>>;
  /** The app's own files besides its mounts, under `blueprint/`. */
  readonly files?: ReadonlyArray<LoadedFile>;
}

/** The app's model: every package installed, only `mounts` mounted. */
export const modelExit = (f: Features, app: AppSpec) => {
  const appFiles = [
    ...Object.entries(app.mounts).map(([mount, name]) => file(`features/${mount}.ts`, { default: Blueprint.use(f.pkgs[name].descriptor) })),
    ...(app.files ?? []),
  ];
  const installed: ReadonlyArray<PluginPackage> = (Object.keys(f.pkgs) as ReadonlyArray<Name>).map((name) => ({ name: `@fixture/${name}`, version: "1.0.0", kind: "feature", descriptor: f.pkgs[name].descriptor }));
  const source = Layer.succeed(BlueprintSource, {
    list: Effect.succeed(appFiles.map((x) => x.path).sort()),
    load: (path) => Effect.succeed(appFiles.find((x) => x.path === path)!),
    plugins: Effect.succeed(installed),
    pluginFiles: (pkg) => {
      const name = pkg.slice("@fixture/".length) as Name;
      return Effect.succeed({ integrity: `sha256-${name}`, files: f.pkgs[name].files.map((x) => ({ ...x, specifier: `${pkg}/blueprint/${x.path}` })) });
    },
  });
  return Effect.runPromiseExit(Compiler.model.pipe(Effect.provide(source)));
};

/** The model, or a failure carrying every problem the compiler gave. */
export const modelOf = (f: Features, app: AppSpec): Promise<Model> =>
  modelExit(f, app).then((exit) => (Exit.isSuccess(exit) ? exit.value : expect.fail(`the blueprint was refused:\n${problemsOf(exit).join("\n")}`)));

export const problemsOf = (exit: Exit.Exit<unknown, unknown>): ReadonlyArray<string> => {
  if (Exit.isSuccess(exit)) return [];
  const error = exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid);
  return error instanceof BlueprintInvalid ? error.problems : [`not a refusal of the blueprint: ${String(exit.cause)}`];
};

/** What the model holds for one contract, as #1133 says it does (`model.contracts`): read by a cast, since `Model` has no such field on `main`. */
export interface ContractModel {
  readonly owner: string;
  readonly file: string;
  readonly optional: boolean;
  readonly input: Readonly<Record<string, unknown>>;
  readonly output: Readonly<Record<string, unknown>>;
  readonly errors: ReadonlyArray<string>;
  readonly filler: { readonly mount: string; readonly file: string; readonly writes: ReadonlyArray<string> } | null;
}
export const contractsOf = (m: Model): Readonly<Record<string, ContractModel>> | undefined => (m as unknown as { readonly contracts?: Readonly<Record<string, ContractModel>> }).contracts;

/** The features every positive check mounts: the ledger, payments, budgets through payments, the US chart, payroll and its US tax. */
export const MOUNTED: AppSpec["mounts"] = { ledger: "ledger", payments: "payments", budgets: "budgets", "chart-us": "chart-us", payroll: "payroll", "payroll-tax-us": "payroll-tax-us" };

/** Each fixture file's specifier, as a refusal names it. */
export const at = (pkg: Name, path: string) => `@fixture/${pkg}/blueprint/${path}`;
