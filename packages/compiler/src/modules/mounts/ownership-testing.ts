// The scratch books the #1134 compiler checks build (CX-feature-ownership): a `ledger` feature that owns its lines, its journal entries and its
// accounts, a `payroll` feature that needs it and owns its slips and pay runs, and a `rogue` feature that needs nothing, each an installed
// package the app may or may not mount. A check plants one more file (a verb, an extension of another feature's thing) in one package or in the
// app, and reads what the compiler said. Read by ownership.test.ts and ownership-refused.test.ts. Written by the checks author for Goal 16;
// the builder never edits it.
//
// The allowed way to write another feature's thing is gap 1's in-commit call (#1079, CX-inner-operations), `Blueprint.step.operation(op)`.
// It isn't on `main` yet, so it is reached through `innerStep()`, which says what is missing instead of failing to load.
import { Effect, Exit, Layer } from "effect";
import { expect } from "vitest";
import { Blueprint, type Feature, type Mount, type Operation, type Step, type Thing } from "orthograph";
import { BlueprintSource, type LoadedFile, type PluginPackage } from "#modules/source/types.js";
import { BlueprintInvalid, type Model } from "#modules/model/types.js";
import { Compiler } from "#modules/model/service.js";

/** Gap 1's step, `Blueprint.step.operation(op)`, or a failure naming it. */
export const innerStep = (op: Operation): Step => {
  const step = Blueprint.step as unknown as { readonly operation?: (op: Operation) => Step };
  if (typeof step.operation !== "function") expect.fail("Blueprint.step.operation is not built: an operation can't run another inside its commit (#1079)");
  return step.operation(op);
};

/** Every feature package the checks install, by its own name (`@fixture/<name>`). */
export type Name = "ledger" | "payroll" | "rogue";

export const file = (path: string, exports: Readonly<Record<string, unknown>>): LoadedFile => ({ path, exports });
const id = (prefix: string) => Blueprint.id(prefix);
const memo = Blueprint.text({ max: 100 });

/** One operation with the parts a check varies; the rest is what every scratch operation has. */
export const operation = (thing: Thing, spec: {
  readonly move?: unknown; readonly steps?: Readonly<Record<string, Step>>; readonly allowed?: ReadonlyArray<unknown>; readonly on?: ReadonlyArray<unknown>;
  readonly runs?: "client"; readonly payload?: Readonly<Record<string, unknown>>;
}) =>
  Blueprint.operation(thing, {
    description: "A scratch operation.",
    payload: (spec.payload ?? { id: (thing.fields as { readonly id: never }).id }) as never,
    ...(spec.runs ? { runs: spec.runs } : {}),
    answer: {},
    allowed: (spec.allowed ?? [Blueprint.signedIn]) as never,
    ...(spec.move ? { move: spec.move as never } : {}),
    ...(spec.steps ? { steps: spec.steps } : {}),
    ...(spec.on ? { on: spec.on as never } : {}),
  }) as unknown as Operation;

/**
 * The books, built fresh for each check, so no declaration is shared between two compilations.
 * The ledger writes a line by every way: `gl-entry.post` (a creating move), `gl-entry.reverse` (a move), `gl-entry.archive` (the keeper's move),
 * `gl-entry.touch` (a step naming nothing), `gl-entry.sweep` (the runtime's, on its own event, a step naming the line) and
 * `journal-entry.submit` (a step on another of its things). `gl-entry.get` (a read), `gl-entry.preview` (reads only) and
 * `journal-entry.draft` (writes its own entry) don't write a line.
 */
export const books = () => {
  // ---- ledger ----
  const GlEntry = Blueprint.thing({ description: "One line of the general ledger.", fields: { id: id("gle"), memo, postedAt: Blueprint.instant() }, code: "GL" });
  const Posted = Blueprint.event({ id: GlEntry.fields.id });
  const Reversed = Blueprint.event({ id: GlEntry.fields.id });
  const Archived = Blueprint.event({ id: GlEntry.fields.id });
  const glMachine = Blueprint.machine(GlEntry, {
    states: ["posted", "reversed", "archived"],
    moves: {
      post: { from: [], to: "posted", emits: Posted },
      reverse: { from: ["posted"], to: "reversed", emits: Reversed },
      archive: { from: ["posted"], to: "archived", emits: Archived, by: Blueprint.time.after("postedAt", "1 year") },
    },
    notFrom: { exit: 70 },
  });
  const JournalEntry = Blueprint.thing({ description: "A voucher of balanced lines.", fields: { id: id("jen"), memo }, code: "JE" });
  const Drafted = Blueprint.event({ id: JournalEntry.fields.id });
  const Submitted = Blueprint.event({ id: JournalEntry.fields.id });
  const jeMachine = Blueprint.machine(JournalEntry, {
    states: ["draft", "submitted"],
    moves: { draft: { from: [], to: "draft", emits: Drafted }, submit: { from: ["draft"], to: "submitted", emits: Submitted } },
    notFrom: { exit: 71 },
  });
  const Account = Blueprint.thing({ description: "An account in the chart.", fields: { id: id("acc"), memo }, code: "AC" });
  // A vault on a chain, in a store the ledger brings: its operations run on the chain, as one contract (K25).
  const vaultStore = Blueprint.store.chain.evm();
  const Vault = Blueprint.thing({ description: "Money the company holds on a chain.", fields: { id: id("vlt"), safe: Blueprint.account() }, lives: vaultStore } as never) as unknown as Thing<{ readonly id: any; readonly safe: any }>;
  const VaultOpened = Blueprint.event({ id: Vault.fields.id, safe: Vault.fields.safe });
  const vaultMachine = Blueprint.machine(Vault, { states: ["open"], moves: { open: { from: [], to: "open", emits: VaultOpened } }, notFrom: { exit: 74 } });
  const holder = Blueprint.role(Vault, { who: Vault.fields.safe });
  /** An operation on the vault: on a chain, allowed to who signs, its payload naming the vault and its Safe. */
  const onVault = (move?: unknown) => operation(Vault, { payload: { id: Vault.fields.id, safe: Vault.fields.safe }, allowed: [holder], ...(move ? { move } : {}) });
  const ledger = {
    GlEntry, Posted, Reversed, Archived, glMachine, JournalEntry, Drafted, Submitted, jeMachine, Account, vaultStore, Vault, VaultOpened, vaultMachine, holder, onVault,
    post: operation(GlEntry, { move: glMachine.moves.post, steps: { lines: Blueprint.step.database() } }),
    reverse: operation(GlEntry, { move: glMachine.moves.reverse }),
    // The ledger writes its line by every way too: the keeper's move, a bare step, and a step the runtime runs on its own event.
    archive: operation(GlEntry, { move: glMachine.moves.archive, allowed: [Blueprint.keeper] }),
    touch: operation(GlEntry, { steps: { save: Blueprint.step.database() } }),
    sweep: operation(GlEntry, { allowed: [Blueprint.system], on: [Blueprint.on(Reversed, (e) => ({ id: e.id }))], steps: { save: Blueprint.step.database({ writes: [GlEntry] }) } }),
    get: Blueprint.read(GlEntry, { by: "id", fields: ["id", "memo", "state"], allowed: [Blueprint.signedIn] }),
    preview: operation(GlEntry, { steps: { look: Blueprint.step.database({ writes: [] }) } }),
    draft: operation(JournalEntry, { move: jeMachine.moves.draft }),
    submit: operation(JournalEntry, { move: jeMachine.moves.submit, steps: { lines: Blueprint.step.database({ writes: [JournalEntry, GlEntry] }) } }),
    open: onVault(vaultMachine.moves.open),
  };

  // ---- payroll: its own things, written by every way a feature has ----
  const SalarySlip = Blueprint.thing({ description: "What one person is paid for a period.", fields: { id: id("sls"), memo, submittedAt: Blueprint.instant() }, code: "SS" });
  const SlipDrafted = Blueprint.event({ id: SalarySlip.fields.id });
  const SlipSubmitted = Blueprint.event({ id: SalarySlip.fields.id });
  const SlipLapsed = Blueprint.event({ id: SalarySlip.fields.id });
  const SlipSettled = Blueprint.event({ id: SalarySlip.fields.id });
  const slipMachine = Blueprint.machine(SalarySlip, {
    states: ["draft", "submitted", "lapsed", "settled"],
    moves: {
      draft: { from: [], to: "draft", emits: SlipDrafted },
      submit: { from: ["draft"], to: "submitted", emits: SlipSubmitted },
      // Made by time: the keeper runs it (K23 section 3).
      lapse: { from: ["submitted"], to: "lapsed", emits: SlipLapsed, by: Blueprint.time.after("submittedAt", "30 days") },
      settle: { from: ["submitted"], to: "settled", emits: SlipSettled },
    },
    notFrom: { exit: 72 },
  });
  const PayrollEntry = Blueprint.thing({ description: "A pay run.", fields: { id: id("pye"), memo }, code: "PE" });
  const RunStarted = Blueprint.event({ id: PayrollEntry.fields.id });
  const runMachine = Blueprint.machine(PayrollEntry, { states: ["started"], moves: { start: { from: [], to: "started", emits: RunStarted } }, notFrom: { exit: 73 } });
  const payroll = { SalarySlip, SlipDrafted, SlipSubmitted, SlipLapsed, SlipSettled, slipMachine, PayrollEntry, RunStarted, runMachine };

  /** Payroll's own operations, each one way of writing: `steps` adds steps to one of them, so a check can plant one write. */
  const payrollVerbs = (extra: Partial<Record<"draft" | "submit" | "lapse" | "settle" | "start", Readonly<Record<string, Step>>>> = {}) => ({
    draft: operation(SalarySlip, { move: slipMachine.moves.draft, steps: { save: Blueprint.step.database(), ...extra.draft } }),
    submit: operation(SalarySlip, { move: slipMachine.moves.submit, steps: { save: Blueprint.step.database(), ...extra.submit } }),
    lapse: operation(SalarySlip, { move: slipMachine.moves.lapse, allowed: [Blueprint.keeper], steps: { save: Blueprint.step.database(), ...extra.lapse } }),
    // Run after the ledger posts a line: a reaction to the ledger's event, by the runtime (`on:`).
    settle: operation(SalarySlip, { move: slipMachine.moves.settle, allowed: [Blueprint.system], on: [Blueprint.on(Posted, (e) => ({ id: e.id }))], steps: { save: Blueprint.step.database(), ...extra.settle } }),
    // A pay run writes its slips: two of payroll's own things in one step.
    start: operation(PayrollEntry, { move: runMachine.moves.start, steps: { slips: Blueprint.step.database({ writes: [PayrollEntry, SalarySlip] }), ...extra.start } }),
  });

  const ledgerFeature = Blueprint.feature({ description: "The books." });
  const descriptors: Record<Name, Feature<any>> = {
    ledger: ledgerFeature,
    payroll: Blueprint.feature({ description: "Payroll.", needs: [ledgerFeature] }),
    rogue: Blueprint.feature({ description: "Needs nothing." }),
  };
  return { ledger, payroll, payrollVerbs, descriptors };
};
export type Books = ReturnType<typeof books>;

/** Each package's files as the checks start them; `payrollVerbs` swaps payroll's own operations. */
const baseFiles = (b: Books, verbs: ReturnType<Books["payrollVerbs"]>): Record<Name, ReadonlyArray<LoadedFile>> => {
  const l = b.ledger;
  const p = b.payroll;
  return {
    ledger: [
      file("things/gl-entry/thing.js", { GlEntry: l.GlEntry }),
      file("things/gl-entry/events.js", { Posted: l.Posted, Reversed: l.Reversed, Archived: l.Archived }),
      file("things/gl-entry/machine.js", { machine: l.glMachine }),
      file("things/gl-entry/verbs/post.js", { default: l.post }),
      file("things/gl-entry/verbs/reverse.js", { default: l.reverse }),
      file("things/gl-entry/verbs/archive.js", { default: l.archive }),
      file("things/gl-entry/verbs/touch.js", { default: l.touch }),
      file("things/gl-entry/verbs/sweep.js", { default: l.sweep }),
      file("things/gl-entry/verbs/get.js", { default: l.get }),
      file("things/gl-entry/verbs/preview.js", { default: l.preview }),
      file("things/journal-entry/thing.js", { JournalEntry: l.JournalEntry }),
      file("things/journal-entry/events.js", { Drafted: l.Drafted, Submitted: l.Submitted }),
      file("things/journal-entry/machine.js", { machine: l.jeMachine }),
      file("things/journal-entry/verbs/draft.js", { default: l.draft }),
      file("things/journal-entry/verbs/submit.js", { default: l.submit }),
      file("things/account/thing.js", { Account: l.Account }),
      file("stores/vault.js", { default: l.vaultStore }),
      file("things/vault/thing.js", { Vault: l.Vault }),
      file("things/vault/events.js", { VaultOpened: l.VaultOpened }),
      file("things/vault/machine.js", { machine: l.vaultMachine }),
      file("things/vault/roles.js", { holder: l.holder }),
      file("things/vault/verbs/open.js", { default: l.open }),
    ],
    payroll: [
      file("things/salary-slip/thing.js", { SalarySlip: p.SalarySlip }),
      file("things/salary-slip/events.js", { SlipDrafted: p.SlipDrafted, SlipSubmitted: p.SlipSubmitted, SlipLapsed: p.SlipLapsed, SlipSettled: p.SlipSettled }),
      file("things/salary-slip/machine.js", { machine: p.slipMachine }),
      ...(["draft", "submit", "lapse", "settle"] as const).map((v) => file(`things/salary-slip/verbs/${v}.js`, { default: verbs[v] })),
      file("things/payroll-entry/thing.js", { PayrollEntry: p.PayrollEntry }),
      file("things/payroll-entry/events.js", { RunStarted: p.RunStarted }),
      file("things/payroll-entry/machine.js", { machine: p.runMachine }),
      file("things/payroll-entry/verbs/start.js", { default: verbs.start }),
    ],
    rogue: [],
  };
};

export interface AppSpec {
  /** Each mount, by its file's name (`blueprint/features/<mount>.ts`), and the package it mounts. */
  readonly mounts: Readonly<Record<string, Name>>;
  /** A mount's own edits (`p.omit(...)`), by mount name. */
  readonly edits?: Readonly<Record<string, (p: any) => ReadonlyArray<unknown>>>;
  /** Payroll's own operations, with a planted step in one of them. Default: `payrollVerbs()`. */
  readonly verbs?: ReturnType<Books["payrollVerbs"]>;
  /** Files planted in a package, under its blueprint folder. */
  readonly plant?: Partial<Record<Name, ReadonlyArray<LoadedFile>>>;
  /** The app's own files besides its mounts and its `posting` thing, under `blueprint/`. */
  readonly files?: ReadonlyArray<LoadedFile>;
}

/** The app's own thing, `posting`, with one operation that writes only it. */
export const appPosting = () => {
  const Posting = Blueprint.thing({ description: "A posting the app keeps.", fields: { id: id("pst"), memo }, code: "PS" });
  return { Posting, record: operation(Posting, { steps: { save: Blueprint.step.database() } }) };
};

/** The app's model: every package installed, only `mounts` mounted. */
export const modelExit = (b: Books, app: AppSpec) => {
  const files = baseFiles(b, app.verbs ?? b.payrollVerbs());
  const posting = appPosting();
  const appFiles = [
    ...Object.entries(app.mounts).map(([mount, name]) => {
      const edit = app.edits?.[mount];
      const use = edit ? Blueprint.use(b.descriptors[name], edit as never) : Blueprint.use(b.descriptors[name]);
      return file(`features/${mount}.ts`, { default: use as Mount });
    }),
    file("things/posting/thing.ts", { Posting: posting.Posting }),
    file("things/posting/verbs/record.ts", { default: posting.record }),
    ...(app.files ?? []),
  ];
  const installed: ReadonlyArray<PluginPackage> = (Object.keys(b.descriptors) as ReadonlyArray<Name>).map((name) => ({ name: `@fixture/${name}`, version: "1.0.0", kind: "feature", descriptor: b.descriptors[name] }));
  const source = Layer.succeed(BlueprintSource, {
    list: Effect.succeed(appFiles.map((f) => f.path).sort()),
    load: (path) => Effect.succeed(appFiles.find((f) => f.path === path)!),
    plugins: Effect.succeed(installed),
    pluginFiles: (pkg) => {
      const name = pkg.slice("@fixture/".length) as Name;
      const all = [...files[name], ...(app.plant?.[name] ?? [])];
      return Effect.succeed({ integrity: `sha256-${name}`, files: all.map((f) => ({ ...f, specifier: `${pkg}/blueprint/${f.path}` })) });
    },
  });
  return Effect.runPromiseExit(Compiler.model.pipe(Effect.provide(source)));
};

export const problemsOf = (exit: Exit.Exit<unknown, unknown>): ReadonlyArray<string> => {
  if (Exit.isSuccess(exit)) return [];
  const error = exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid);
  return error instanceof BlueprintInvalid ? error.problems : [`not a refusal of the blueprint: ${String(exit.cause)}`];
};

/** The model, or a failure carrying every problem the compiler gave. */
export const modelOf = (b: Books, app: AppSpec): Promise<Model> =>
  modelExit(b, app).then((exit) => (Exit.isSuccess(exit) ? exit.value : expect.fail(`the blueprint was refused:\n${problemsOf(exit).join("\n")}`)));

/** The ledger and payroll, each under its own name. */
export const MOUNTED: AppSpec["mounts"] = { ledger: "ledger", payroll: "payroll" };

/** Where a planted file of a package is, as a problem names it. */
export const at = (name: Name, path: string) => `@fixture/${name}/blueprint/${path}`;

/** The ledger's operations that write a line, as the model names them under the mount `ledger`, in code-unit order. */
export const LINE_WRITERS = ["gl-entry.archive", "gl-entry.post", "gl-entry.reverse", "gl-entry.sweep", "gl-entry.touch", "journal-entry.submit"] as const;
/** The ledger's operations that write a journal entry. */
export const ENTRY_WRITERS = ["journal-entry.draft", "journal-entry.submit"] as const;
/** Payroll's operations that write a slip: its own four, and the pay run's, whose step writes slips. */
export const SLIP_WRITERS = ["payroll-entry.start", "salary-slip.draft", "salary-slip.lapse", "salary-slip.settle", "salary-slip.submit"] as const;

export interface Refusal {
  /** The mount that brought the file, and the file under the package's blueprint folder. */
  readonly mount: string;
  readonly pkg: Name;
  readonly path: string;
  readonly feature: string;
  readonly operation: string;
  /** Every way it writes the thing: its move, then its steps in the order declared. */
  readonly how: ReadonlyArray<string>;
  readonly thing: string;
  readonly owner: string;
  /** Every operation of the owner's mount, in the model, that writes the thing. */
  readonly offers: ReadonlyArray<string>;
  /** Where the writing operation runs, when not on the server: there it can't run another inside its commit (CX-inner-operations, call 4). */
  readonly runs?: "client" | "chain";
}

/** The whole refusal, word for word, as CX-feature-ownership call 6 says it: built from the fixture, never read from what it judges. */
export const refusal = (r: Refusal): string =>
  `blueprint/features/${r.mount}.ts: ${at(r.pkg, r.path)}: the feature ${r.feature} writes ${r.thing} in ${r.operation} (${r.how.join(" and ")}), ` +
  `and ${r.thing} is the feature ${r.owner}'s: a feature writes only its own things. ` +
  (r.offers.length > 0
    ? r.runs === undefined
      ? `Run one of ${r.owner}'s operations that write it inside this commit instead, as a step (Blueprint.step.operation): ${[...r.offers].sort().join(", ")}`
      : `Call one of ${r.owner}'s operations that write it instead, on its own: ${r.operation} runs ${r.runs === "client" ? "on the caller's device" : "on a chain"}, ` +
        `where an operation can't run another inside its commit (CX-inner-operations, call 4): ${[...r.offers].sort().join(", ")}`
    : `${r.owner} offers no operation that writes it to run inside this commit (Blueprint.step.operation): ask its owner for one`);
