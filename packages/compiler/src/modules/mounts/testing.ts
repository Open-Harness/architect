// The scratch books the #1132 compiler checks build (CX-open-sets): a `ledger` feature that owns two open sets, the kinds of voucher that
// post to it and the kinds of party a line is against, and the features that add to them, each an installed package the app may or may not
// mount. Read by open-sets.test.ts and open-sets-refused.test.ts. Written by the checks author for Goal 16; the builder never edits it.
//
// The open-set surface doesn't exist on `main`, so it is reached here through `surface()`, which says what is missing instead of failing to
// load: `Blueprint.oneOf.open(members)` declares a set, `Blueprint.oneOf.add(set, members)` adds to one, and `Blueprint.refAny.of(set)` is a
// reference holding a kind from a set and an id.
import { Effect, Exit, Layer } from "effect";
import { expect } from "vitest";
import { Blueprint, Schema, type Feature, type Value } from "orthograph";
import { BlueprintSource, type LoadedFile, type PluginPackage } from "#modules/source/types.js";
import { BlueprintInvalid, type Model } from "#modules/model/types.js";
import { Compiler } from "#modules/model/service.js";

export interface OpenSets {
  readonly open: (members: ReadonlyArray<string>) => Value;
  readonly add: (set: Value, members: ReadonlyArray<string>) => unknown;
  readonly refOf: (set: Value) => Value;
}

/** The surface #1132 adds, or a failure naming the part that isn't built. */
export const surface = (): OpenSets => {
  const oneOf = Blueprint.oneOf as unknown as { readonly open?: unknown; readonly add?: unknown };
  const refAny = Blueprint.refAny as unknown as { readonly of?: unknown };
  if (typeof oneOf.open !== "function") expect.fail("Blueprint.oneOf.open is not built: a value can't be declared open (#1132)");
  if (typeof oneOf.add !== "function") expect.fail("Blueprint.oneOf.add is not built: a feature can't add members to an open set (#1132)");
  if (typeof refAny.of !== "function") expect.fail("Blueprint.refAny.of is not built: a reference can't hold a kind from an open set (#1132)");
  return { open: oneOf.open as OpenSets["open"], add: oneOf.add as OpenSets["add"], refOf: refAny.of as OpenSets["refOf"] };
};

/** Every feature package the checks install, by its own name (`@fixture/<name>`). */
export type Name = "ledger" | "payments" | "expenses" | "parties" | "payroll" | "invoicing" | "rogue" | "crm" | "leads" | "projects" | "bookkeeping" | "reports" | "audit";

/** What one installed package is: its descriptor, and its blueprint files by path under its blueprint folder. */
interface Pkg {
  readonly descriptor: Feature<any>;
  readonly files: ReadonlyArray<LoadedFile>;
}

const file = (path: string, exports: Readonly<Record<string, unknown>>): LoadedFile => ({ path, exports });

/** What the members of each set are, as the fixtures declare them: the values the checks expect, never read from the model they judge. */
// Two members, out of sort order: the owner's own keep the owner's order.
export const OWN_VOUCHERS = ["Journal Entry", "Contra Entry"] as const;
/** The members of the app's own open set, `Channel`: no feature depends on the app, so no feature adds to it. */
export const OWN_CHANNELS = ["Web", "Phone"] as const;
/** The members of the crm's own `PartyType`, a set apart from the ledger's though it has the same export name in a file of the same path. */
export const OWN_CONTACTS = ["Lead"] as const;

/** A package's values, given the surface and the sets: what a check plants. */
export type Plant = (s: OpenSets, l: Ledger) => Readonly<Record<string, unknown>>;

/**
 * The books, built fresh: the ledger's sets, a closed value beside them, its thing with an event and an operation, and each feature that adds.
 * `change` swaps one package's additions, so a refusal check plants exactly one wrong declaration. `planted` gives any package, the owners
 * included, one more file, `values/planted.js`, with what it exports.
 */
export const books = (change: Partial<Record<Exclude<Name, "ledger" | "crm">, Plant>> = {}, planted: Partial<Record<Name, Plant>> = {}) => {
  const s = surface();
  const VoucherType = Blueprint.value(s.open(OWN_VOUCHERS));
  const PartyType = Blueprint.value(s.open([]));
  const AccountType = Blueprint.value(Blueprint.oneOf(["Bank", "Cash"]));
  const Voucher = Blueprint.value(s.refOf(VoucherType));
  const Party = Blueprint.value(s.refOf(PartyType));
  // The crm owns an open set of its own, also exported as `PartyType` and from a file of the same path as the ledger's (`values/ledger.js`):
  // a set is its owner's and its export's, so the two are two sets, and what is added to one is never in the other.
  const CrmPartyType = Blueprint.value(s.open(OWN_CONTACTS));
  // The crm's set with no member of its own.
  const Segment = Blueprint.value(s.open([]));
  // The app's own open set: its owner is the app.
  const Channel = Blueprint.value(s.open(OWN_CHANNELS));
  // Payments owns a set of its own: payroll needs payments and may add to it; expenses, its sibling (both need the ledger), may not.
  const PaymentMethod = Blueprint.value(s.open(["Bank Transfer"]));
  // Projects needs the crm and owns a set: the crm is what its owner needs, not something that depends on it, so the crm may not add.
  const ProjectKind = Blueprint.value(s.open(["Internal"]));
  const ledger: Ledger = { VoucherType, PartyType, AccountType, Voucher, Party, CrmPartyType, Segment, Channel, PaymentMethod, ProjectKind };

  const GlEntry = Blueprint.thing({
    description: "One line of the general ledger, posted by a voucher.",
    fields: { id: Blueprint.id("gle"), voucherType: VoucherType, voucher: Voucher, party: Party, account: AccountType, source: Blueprint.refAny() },
    code: "GL",
  });
  const Posted = Blueprint.event({ entry: GlEntry.fields.id, voucherType: GlEntry.fields.voucherType, voucher: GlEntry.fields.voucher });
  const post = Blueprint.operation(GlEntry, {
    description: "Post a line.",
    payload: {
      voucherType: GlEntry.fields.voucherType, voucher: GlEntry.fields.voucher, party: GlEntry.fields.party, account: GlEntry.fields.account,
      // Structs and lists holding no set, beside the matrix: their models are as they were.
      plainLine: Blueprint.value(Schema.Struct({ note: Schema.String })),
      plainLines: Blueprint.list(Blueprint.value(Schema.Struct({ note: Schema.String }))),
      notes: Blueprint.list(Blueprint.text()),
    },
    answer: { entry: GlEntry.fields.id },
    allowed: [Blueprint.signedIn],
  });

  // The matrix: every cell (a wrapper around the set or a reference to it) as a thing's field, an operation's payload and answer, and an event.
  const Matrix = Blueprint.thing({ description: "Every place a set can sit.", fields: { id: Blueprint.id("mtx"), ...matrixValues(VoucherType, Voucher) }, code: "MX" });
  const Checked = Blueprint.event({ matrix: Matrix.fields.id, ...matrixValues(VoucherType, Voucher) });
  const check = Blueprint.operation(Matrix, {
    description: "Check every place.",
    payload: { matrix: Matrix.fields.id, ...matrixValues(VoucherType, Voucher) },
    answer: { matrix: Matrix.fields.id, ...matrixValues(VoucherType, Voucher) },
    allowed: [Blueprint.signedIn],
  });

  const ledgerFeature = Blueprint.feature({ description: "The books." });
  const feature = (description: string, needs: ReadonlyArray<Feature<any>>) => Blueprint.feature({ description, needs });
  const payments = feature("Payments.", [ledgerFeature]);
  const payroll = feature("Payroll.", [payments]);
  const crmFeature = Blueprint.feature({ description: "Contacts. Needs nothing, and is not the ledger." });
  const Contact = Blueprint.thing({ description: "Someone the crm keeps.", fields: { id: Blueprint.id("con"), partyType: CrmPartyType }, code: "CO" });
  const projectsFeature = feature("Projects.", [crmFeature]);
  const Payment = Blueprint.thing({ description: "A payment.", fields: { id: Blueprint.id("pay"), method: PaymentMethod }, code: "PY" });
  const Project = Blueprint.thing({ description: "A project.", fields: { id: Blueprint.id("prj"), kind: ProjectKind }, code: "PJ" });
  // Bookkeeping needs the ledger only when its mount picks `posting`: unpicked, it doesn't depend on the ledger.
  const mode = Blueprint.choice({ plain: "Keeps its own books.", posting: "Posts to the ledger." });
  const bookkeeping = Blueprint.feature({ description: "Bookkeeping.", choices: { mode }, needs: [Blueprint.need(ledgerFeature, { when: mode.posting })] });
  const adds = (name: Exclude<Name, "ledger" | "crm">, values: Plant) => (change[name] ?? values)(s, ledger);

  const pkgs: Record<Name, Pkg> = {
    ledger: {
      descriptor: ledgerFeature,
      files: [
        file("values/ledger.js", { VoucherType, PartyType, AccountType, Voucher, Party }),
        file("things/gl-entry/thing.js", { GlEntry }),
        file("things/gl-entry/events.js", { Posted }),
        file("things/gl-entry/verbs/post.js", { default: post }),
        file("things/matrix/thing.js", { Matrix }),
        file("things/matrix/events.js", { Checked }),
        file("things/matrix/verbs/check.js", { default: check }),
      ],
    },
    payments: { descriptor: payments, files: [file("values/vouchers.js", adds("payments", (x, l) => ({ paymentEntry: x.add(l.VoucherType, ["Payment Entry"]) })))] },
    expenses: { descriptor: feature("Expense claims.", [ledgerFeature]), files: [file("values/vouchers.js", adds("expenses", (x, l) => ({ expenseClaim: x.add(l.VoucherType, ["Expense Claim"]) })))] },
    parties: { descriptor: feature("Customers and suppliers.", [ledgerFeature]), files: [file("values/parties.js", adds("parties", (x, l) => ({ parties: x.add(l.PartyType, ["Supplier", "Customer"]) })))] },
    // Payroll needs payments, not the ledger itself: it depends on the ledger through payments.
    payroll: {
      descriptor: payroll,
      files: [file("values/payroll.js", adds("payroll", (x, l) => ({ salarySlip: x.add(l.VoucherType, ["Salary Slip"]), employee: x.add(l.PartyType, ["Employee"]) })))],
    },
    invoicing: { descriptor: feature("Invoices.", [ledgerFeature]), files: [file("values/vouchers.js", adds("invoicing", (x, l) => ({ salesInvoice: x.add(l.VoucherType, ["Sales Invoice"]) })))] },
    // Adds to the ledger's set though it needs nothing: it doesn't depend on the set's owner.
    rogue: { descriptor: Blueprint.feature({ description: "Needs nothing." }), files: [file("values/rogue.js", adds("rogue", (x, l) => ({ rogue: x.add(l.VoucherType, ["Rogue Entry"]) })))] },
    crm: {
      descriptor: crmFeature,
      files: [file("values/ledger.js", { PartyType: CrmPartyType, Segment }), file("things/contact/thing.js", { Contact })],
    },
    // Leads needs the crm, not the ledger: it may add to the crm's set, and a refusal check plants it adding to the ledger's.
    leads: { descriptor: feature("Leads.", [crmFeature]), files: [file("values/leads.js", adds("leads", (x, l) => ({ prospect: x.add(l.CrmPartyType, ["Prospect"]) })))] },
    projects: { descriptor: projectsFeature, files: [file("values/projects.js", { ProjectKind, ...adds("projects", () => ({})) }), file("things/project/thing.js", { Project })] },
    // Reports needs payroll: three hops to the ledger (reports, payroll, payments, ledger).
    reports: { descriptor: feature("Reports.", [payroll]), files: [file("values/reports.js", adds("reports", () => ({})))] },
    // Audit needs bookkeeping, whose need on the ledger has a `when`: unpicked, audit doesn't reach the ledger either.
    audit: { descriptor: feature("Audit.", [bookkeeping]), files: [file("values/audit.js", adds("audit", () => ({})))] },
    bookkeeping: { descriptor: bookkeeping, files: [file("values/bookkeeping.js", adds("bookkeeping", (x, l) => ({ opening: x.add(l.VoucherType, ["Opening Balance"]) })))] },
  };
  // Payments' own set sits beside its additions, in a file of its own.
  pkgs.payments = { ...pkgs.payments, files: [...pkgs.payments.files, file("values/methods.js", { PaymentMethod }), file("things/payment/thing.js", { Payment })] };
  for (const [name, plant] of Object.entries(planted) as ReadonlyArray<[Name, Plant]>) pkgs[name] = { ...pkgs[name], files: [...pkgs[name].files, file("values/planted.js", plant(s, ledger))] };

  // An app thing of its own that holds the ledger's sets, as an app that depends on the ledger may.
  // It also holds an optional field of a set, and lists of a set and of a reference to one.
  const Posting = Blueprint.thing({
    description: "A posting the app keeps.",
    fields: {
      id: Blueprint.id("pst"), voucherType: VoucherType, party: Party, channel: Channel, alsoType: Blueprint.optional(VoucherType),
      kinds: Blueprint.list(VoucherType), vouchers: Blueprint.list(Voucher),
    },
    code: "PS",
  });
  return { s, ledger, pkgs, Posting };
};
export interface Ledger {
  readonly VoucherType: Value;
  readonly PartyType: Value;
  readonly AccountType: Value;
  readonly Voucher: Value;
  readonly Party: Value;
  /** The crm's own `PartyType`: another owner's set with the same export name. */
  readonly CrmPartyType: Value;
  /** The crm's set with no member of its own. */
  readonly Segment: Value;
  /** The app's own open set, declared in the app's `blueprint/values/channels.ts`. */
  readonly Channel: Value;
  /** Payments' own set, in `@fixture/payments/blueprint/values/methods.js`. */
  readonly PaymentMethod: Value;
  /** Projects' own set, in `@fixture/projects/blueprint/values/projects.js`; projects needs the crm. */
  readonly ProjectKind: Value;
}
export type Books = ReturnType<typeof books>;

export interface AppSpec {
  /** Each mount, by its file's name (`blueprint/features/<mount>.ts`), and the package it mounts. */
  readonly mounts: Readonly<Record<string, Name>>;
  /** The app's own files besides its mounts, under `blueprint/`. */
  readonly files?: ReadonlyArray<LoadedFile>;
  /** The mounts that pick bookkeeping's `posting`, by mount name. */
  readonly posting?: ReadonlyArray<string>;
}

/** The app's model: every package installed, only `mounts` mounted. */
export const modelExit = (b: Books, app: AppSpec) => {
  const appFiles = [
    ...Object.entries(app.mounts).map(([mount, name]) => file(`features/${mount}.ts`, {
      default: app.posting?.includes(mount)
        ? Blueprint.use(b.pkgs[name].descriptor as Feature<any>, (p: any) => [p.choose(p.choices.mode.posting)])
        : Blueprint.use(b.pkgs[name].descriptor),
    })),
    file("values/channels.ts", { Channel: b.ledger.Channel }),
    file("things/posting/thing.ts", { Posting: b.Posting }),
    ...(app.files ?? []),
  ];
  const installed: ReadonlyArray<PluginPackage> = (Object.keys(b.pkgs) as ReadonlyArray<Name>).map((name) => ({ name: `@fixture/${name}`, version: "1.0.0", kind: "feature", descriptor: b.pkgs[name].descriptor }));
  const source = Layer.succeed(BlueprintSource, {
    list: Effect.succeed(appFiles.map((f) => f.path).sort()),
    load: (path) => Effect.succeed(appFiles.find((f) => f.path === path)!),
    plugins: Effect.succeed(installed),
    pluginFiles: (pkg) => {
      const name = pkg.slice("@fixture/".length) as Name;
      return Effect.succeed({ integrity: `sha256-${name}`, files: b.pkgs[name].files.map((f) => ({ ...f, specifier: `${pkg}/blueprint/${f.path}` })) });
    },
  });
  return Effect.runPromiseExit(Compiler.model.pipe(Effect.provide(source)));
};

/** The model, or a failure carrying every problem the compiler gave. */
export const modelOf = (b: Books, app: AppSpec): Promise<Model> =>
  modelExit(b, app).then((exit) => (Exit.isSuccess(exit) ? exit.value : expect.fail(`the blueprint was refused:\n${problemsOf(exit).join("\n")}`)));

/** A field's options as the model holds them, when it has any. */
export const optionsOf = (field: { readonly value: unknown } | undefined): ReadonlyArray<string> | undefined =>
  (field?.value as { readonly options?: ReadonlyArray<string> } | undefined)?.options;

export const problemsOf = (exit: Exit.Exit<unknown, unknown>): ReadonlyArray<string> => {
  if (Exit.isSuccess(exit)) return [];
  const error = exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid);
  return error instanceof BlueprintInvalid ? error.problems : [`not a refusal of the blueprint: ${String(exit.cause)}`];
};

/** The books every positive check mounts: the ledger and four features that add, payroll through payments. */
export const MOUNTED: AppSpec["mounts"] = { ledger: "ledger", payments: "payments", expenses: "expenses", parties: "parties", payroll: "payroll" };
/** Every feature package but invoicing, mounted under its own name: what the whole dependency relation is judged on. */
export const ALL: AppSpec["mounts"] = { ...MOUNTED, rogue: "rogue", crm: "crm", leads: "leads", projects: "projects", bookkeeping: "bookkeeping", reports: "reports", audit: "audit" };

// ---- Where a set sits: the matrix (CX-open-sets call 3) ----

/** One way a value can hold a value, with the model it must have once its leaf's model is known. Expected shapes come from here, never from the output. */
export interface Wrapper {
  readonly build: (leaf: Value) => Value;
  /** The model, given the leaf's model and which leaf it is: a list of references names the reference's own fields, as any list of structs does today. */
  readonly model: (leaf: unknown, which: "set" | "ref") => unknown;
}
const struct = (fields: Readonly<Record<string, unknown>>) => ({ type: "schema", struct: fields });
const listOf = (item: unknown, fields?: ReadonlyArray<string>) => ({ type: "schema", format: "list", ...(fields ? { fields } : {}), item });
export const WRAPPERS: Readonly<Record<string, Wrapper>> = {
  bare: { build: (l) => l, model: (m) => m },
  optional: { build: (l) => Blueprint.optional(l), model: (m) => m },
  list: { build: (l) => Blueprint.list(l), model: (m, which) => listOf(m, which === "ref" ? ["kind", "id"] : undefined) },
  structField: { build: (l) => Blueprint.value(Schema.Struct({ x: l.schema })), model: (m) => struct({ x: m }) },
  optionalStructField: { build: (l) => Blueprint.value(Schema.Struct({ x: Schema.optionalKey(l.schema) })), model: (m) => struct({ x: m }) },
  listInStruct: { build: (l) => Blueprint.value(Schema.Struct({ xs: Schema.Array(l.schema) })), model: (m) => struct({ xs: listOf(m) }) },
  structInList: { build: (l) => Blueprint.list(Blueprint.value(Schema.Struct({ x: l.schema }))), model: (m) => listOf(struct({ x: m }), ["x"]) },
  threeDeep: { build: (l) => Blueprint.value(Schema.Struct({ a: Schema.Struct({ b: Schema.Struct({ x: l.schema }) }) })), model: (m) => struct({ a: struct({ b: struct({ x: m }) }) }) },
};
/** The two leaves: the voucher set itself, and a reference whose kind is from it. */
export const LEAVES = ["set", "ref"] as const;
/** A cell's field name: `<wrapper>_<leaf>`, the same in every position. */
export const cells = (): ReadonlyArray<readonly [string, string, (typeof LEAVES)[number]]> =>
  Object.keys(WRAPPERS).flatMap((w) => LEAVES.map((leaf) => [`${w}_${leaf}`, w, leaf] as const));
/** Every cell built from the set and the reference. */
const matrixValues = (VoucherType: Value, Voucher: Value): Readonly<Record<string, Value>> =>
  Object.fromEntries(cells().map(([name, w, leaf]) => [name, WRAPPERS[w]!.build(leaf === "set" ? VoucherType : Voucher)]));
