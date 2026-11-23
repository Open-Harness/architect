// The model: every declaration in the blueprint, named, described and hashed. Generators and evals read only this.
import { Data, type Effect } from "effect";
import type { BlueprintSource, SourceError } from "#modules/source/types.js";
import type { ValueMeta } from "orthograph";
import type { MountModel } from "#modules/mounts/types.js";

export type { MountModel, ValueMeta };

/** A declaration belongs to the app or to a mount, with its original name inside that plugin. */
export type FromModel =
  | { readonly kind: "app" }
  | { readonly kind: "feature" | "adapter"; readonly mount: string; readonly package: string; readonly version: string; readonly thing: string };

/** Who may see a field's value, when it is not everyone: `secret`, or private to some roles (`thing.role`). Public is absent. */
export type VisibilityModel = "secret" | { readonly private: ReadonlyArray<string> };

/** A field: what it holds, the named value it uses if any, and the thing field it was taken from if any. */
export interface FieldModel {
  readonly value: ValueMeta;
  readonly named?: string;
  readonly ref?: string;
  /** A payload field the caller may leave out (a list's filters and cursor). */
  readonly optional?: true;
  /** What the field is for, as the blueprint says (`Blueprint.described`); every output carries it (M1.42). */
  readonly description?: string;
  /** Absent means public, the default. Only a public field's value may be a span attribute, a log line or a journal field. */
  readonly visibility?: VisibilityModel;
  /** A secret answer field handed to its caller once, by `Blueprint.issued`: it leaves in the answer of the call that issued it, and nowhere else. */
  readonly issued?: true;
}
export type FieldsModel = Readonly<Record<string, FieldModel>>;

export interface MachineModel {
  readonly states: ReadonlyArray<string>;
  readonly moves: Readonly<Record<string, { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits: string }>>;
  /** The generated refusal: `<Thing>Not<State>`, named after the machine's first state. */
  readonly notFrom: { readonly error: string; readonly exit: number; readonly code: string };
}

/** One rule of a thing (G5): the fields that are one instance's alone, within the states it is `while`, refused with `refuse` when broken. */
export interface InvariantModel {
  readonly kind: "unique";
  /** The key's fields, in the order written. */
  readonly fields: ReadonlyArray<string>;
  /** Absent: the rule holds in every state. */
  readonly while?: ReadonlyArray<string>;
  /** The thing's own error the runtime refuses with; absent when no caller can break the rule. */
  readonly refuse?: string;
  /** Written words that replace the sentence generated from the rule. */
  readonly description?: string;
}

export interface ThingModel {
  readonly name: string;
  readonly identifier: string;
  /** The prefix of its refusal codes: `AL` in `[AL-002]`. */
  readonly code: string;
  readonly description: string;
  readonly fields: FieldsModel;
  /** The kind of place its state is kept: D1 rows, or a Durable Object per instance. */
  readonly lives: "database" | "actor";
  /** The declared store it lives in (a key of `Model.stores`); absent when it lives in the project's default store. */
  readonly store?: string;
  /** Its rules (G5), by name: what stays true among its instances. Absent when it has none; a rule's full name is `<thing>.<name>`. */
  readonly invariants?: Readonly<Record<string, InvariantModel>>;
  readonly machine: MachineModel | null;
  /**
   * Its not-found refusal, present only when some operation can refuse it (K16): the one it declares under the name
   * `<Thing>NotFound`, else generated at `<XX>-901`, exit 4, HTTP 404.
   */
  readonly notFound?: { readonly error: string; readonly exit: number; readonly code: string };
  readonly events: Readonly<Record<string, FieldsModel>>;
  /** Each with its code, which never moves once released. */
  readonly errors: Readonly<Record<string, { readonly fields: FieldsModel; readonly exit: number; readonly code: string }>>;
  readonly roles: ReadonlyArray<string>;
  readonly roleRules: Readonly<Record<string, string | null>>;
  readonly from: FromModel;
  readonly hash: string;
}

/**
 * One `allowed` entry. `via` is the ways in it keeps, sorted, when `.via` or `.notVia` narrowed it (M2-auth, fork 2): absent, every way in.
 * `system` admits the runtime's own work only; a role with a `service` admits the service of that mount only.
 */
export type AllowedModel =
  | { readonly kind: "anyone" }
  | { readonly kind: "signed-in"; readonly via?: ReadonlyArray<string> }
  | { readonly kind: "system" }
  | { readonly kind: "role"; readonly role: string; readonly via?: ReadonlyArray<string>; readonly service?: string }
  | { readonly kind: "role-of"; readonly role: string; readonly path: string; readonly via?: ReadonlyArray<string>; readonly service?: string };

/** A step of an operation: its span's name and kind, and, for a call out, the adapter's call it makes. */
export interface StepModel {
  readonly name: string;
  readonly type: string;
  /** The things a database step writes, when it names them (stores). */
  readonly writes?: ReadonlyArray<string>;
  /** Present only when the step may be skipped (K5): eval 6 lets an answered call run without it. */
  readonly optional?: boolean;
  readonly call?: { readonly mount: string; readonly call: string; readonly mode: "promise" | "effect" };
}

export interface OperationModel {
  /** A read is answered from the thing's records with no handler. */
  readonly kind: "operation" | "read";
  readonly name: string;
  readonly thing: string;
  readonly verb: string;
  readonly identifier: string;
  readonly file: string;
  readonly description: string;
  readonly payload: FieldsModel;
  readonly answer: FieldsModel;
  readonly move: { readonly key: string; readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits: string } | null;
  /** Declared errors, then the generated ones the runtime can refuse with: the machine's, `<Thing>NotFound`, and NotAllowed. */
  readonly errors: ReadonlyArray<string>;
  /** The refusals the runtime makes for this operation, never in `errors`: each to the full name of the rule it refuses for (`handle.oneHolderPerName`), G5. Absent when none. */
  readonly invariants?: Readonly<Record<string, string>>;
  /** Every rule this operation can break, as `<thing>.<rule>`, each once, whether or not the rule owns a refusal (G5 section 3, S31). `[]` when none. */
  readonly breaks: ReadonlyArray<string>;
  readonly refusals: ReadonlyArray<string>;
  /** Each payload field holding some thing's id, and that thing: read before the handler and handed in as `refs.<field>`. */
  readonly refs?: Readonly<Record<string, string>>;
  /** The payload fields no role check reads, and the `<Thing>NotFound` a missing one is refused with before the handler. */
  readonly notFound?: Readonly<Record<string, string>>;
  /** A creating move's field (the answer's, else the payload's) that carries the id the runtime mints and hands in as `id`. */
  readonly mints?: string;
  readonly allowed: ReadonlyArray<AllowedModel>;
  /**
   * Whether the MCP door lists it as a tool: some `allowed` entry admits an agent, the mount's narrowing (`via`) keeps `agent`, and it does
   * not run on the caller's device (M2-auth, fork 2). Said on every operation and read, so a projection never works it out again.
   */
  readonly agentTool: boolean;
  readonly steps: Readonly<Record<string, StepModel>>;
  readonly idempotent: "request" | null;
  /** A person must say yes before it runs. Present only when declared, and only ever `true` (#466). */
  readonly needsApproval?: true;
  /** Where it runs: `server`, or `client` (on the caller's device) for a plugin's operation that has a code entry per host. */
  readonly runs: "server" | "client";
  /** `network` when its guarantee needs a network test (a target sets it); `unit` otherwise. */
  readonly test: "unit" | "network";
  readonly budget: { readonly p95Ms: number } | null;
  /** A list read: what it filters by, its order and its page size. Present only for lists. */
  readonly list?: { readonly where: ReadonlyArray<string>; readonly order: string; readonly page: number };
  /** A plugin operation’s `file` is a package specifier. */
  readonly from: FromModel;
  readonly blanks?: ReadonlyArray<string>;
  /** The ways in a mount left it, when the mount narrowed it. */
  readonly via?: ReadonlyArray<string>;
  readonly hash: string;
}

export type PublicationModel =
  | { readonly how: "npm"; readonly tag: string | null }
  | { readonly how: "homebrew"; readonly tap: string }
  | { readonly how: "binaries"; readonly on: "github-releases" };

/** Where an environment's traces and logs go; never a token, an address or the name of a secret. */
export type SinkModel = { readonly sink: "local" } | { readonly sink: "axiom"; readonly group: string };

/** An environment, named by its file: `blueprint/environments/staging.ts` is `staging`. */
export interface EnvironmentModel {
  readonly name: string;
  readonly file: string;
  readonly runs: string;
  /** Superseded by `issues` (M2-auth, "Smaller calls" 4); present only when the environment still says it. */
  readonly identity?: "test-principals" | "better-auth";
  /** The ways in it issues credentials for, sorted; present only when it names them (absent: every way in). */
  readonly issues?: ReadonlyArray<string>;
  /** How long a world of this environment lives, when it has a lifetime. */
  readonly lifetimeMs: number | null;
  readonly cloud: { readonly provider: "cloudflare"; readonly database: "d1" | "d1-local" } | null;
  readonly database: "d1" | "d1-local" | null;
  /** Only the stores it binds differently from the default, by store name; present only when it binds any. */
  readonly stores?: Readonly<Record<string, "d1" | "d1-local">>;
  /** Secret names, and how each gets its value. Never a value. */
  readonly secrets: Readonly<Record<string, "generated" | "stored">>;
  readonly promotesFrom: string | null;
  /** The sinks it declares, in order; present only when it declares any (O1, D3 #100). */
  readonly telemetry?: ReadonlyArray<SinkModel>;
  readonly deploy: Readonly<Record<string, { readonly how: "worker" | "site"; readonly domain: string | null }>>;
  readonly publish: Readonly<Record<string, ReadonlyArray<PublicationModel>>>;
  readonly hash: string;
}

export interface JourneyCallModel {
  readonly actor: string;
  readonly operation: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly request?: string;
  /** The way in the cast member's credential is made for, when the call says one (`s.ada.via(Via.key)`). */
  readonly via?: string;
}

export interface JourneyModel {
  readonly file: string;
  readonly sourceHash?: string;
  readonly name: string;
  readonly cast: Readonly<Record<string, AllowedModel>>;
  readonly starts: string | null;
  /** What isn't written yet: a stub from `ortho add journeys` until it is filled. `prove` skips it, naming it (K16 e). */
  readonly blanks?: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<{ readonly title: string } & (
    | { readonly call: JourneyCallModel; readonly checks: ReadonlyArray<{ readonly kind: string }> }
    | { readonly skipped: string }
  )>;
}

export interface StartingWorldModel {
  readonly name: string;
  readonly file: string;
  readonly sourceHash?: string;
  readonly from: string | null;
  readonly cast: Readonly<Record<string, AllowedModel>>;
  readonly makes: ReadonlyArray<JourneyCallModel | null>;
  readonly gives: unknown;
}

export type BlankOperationModel = Pick<OperationModel, "kind" | "name" | "thing" | "verb" | "file" | "from">
  & { readonly description?: string; readonly blanks: ReadonlyArray<string> };

/** Where a plugin's store came from: its mount, package and version, and the plugin's own name for the store. */
export interface StoreFromModel {
  readonly mount: string;
  readonly package: string;
  readonly version: string;
  readonly store: string;
}

/** A store, named by its file (`blueprint/stores/ledger.ts` is `ledger`), or by its mount and path (`echo-ledger`). */
export interface StoreModel {
  readonly name: string;
  readonly file: string;
  /** Which host supplies it: `database` or `actor` on Cloudflare. */
  readonly kind: string;
  /** Present only for a plugin's store; its `file` is then a package specifier. */
  readonly from?: StoreFromModel;
  readonly hash: string;
}

/** One burn alert of an objective: it fires when the objective burns at `burn` or more over both windows (long, then short). */
export interface BurnAlertModel {
  readonly name: string;
  readonly burn: number;
  readonly windowsMs: ReadonlyArray<number>;
  readonly severity: "page" | "ticket";
}

/**
 * One alert condition the compiler derives (K18): the labels are exactly `environment` (`*` where the rule holds in every environment), its subject
 * (`operation`, `code` or `journey`), `severity` and `owner`. A latency or defect rule is an objective with its burn alerts; a latency rule also holds the
 * operation's `budget.p95Ms` as `thresholdMs`. An anomaly or a verdict has neither.
 */
export interface AlertRuleModel {
  readonly id: string;
  readonly kind: "latency" | "defect" | "anomaly" | "verdict";
  readonly labels: Readonly<Record<string, string>>;
  readonly target?: number;
  readonly windowDays?: number;
  readonly thresholdMs?: number;
  readonly minCalls?: number;
  readonly alerts?: ReadonlyArray<BurnAlertModel>;
}

export interface Model {
  /** Every refusal in the project and its code: declared errors, each machine's, and the runtime's (`NotAllowed`). */
  readonly refusals: Readonly<Record<string, string>>;
  readonly values: Readonly<Record<string, ValueMeta>>;
  /** The declared stores, by name: present only when the blueprint (or a mount) declares any. */
  readonly stores?: Readonly<Record<string, StoreModel>>;
  readonly things: Readonly<Record<string, ThingModel>>;
  readonly operations: Readonly<Record<string, OperationModel>>;
  readonly journeys: Readonly<Record<string, JourneyModel>>;
  readonly startingWorlds: Readonly<Record<string, StartingWorldModel>>;
  /** Incomplete operations are described here and have no generated entry points. */
  readonly blankOperations?: Readonly<Record<string, BlankOperationModel>>;
  /**
   * What is still `Blueprint.todo`, by declaration (`allowance`, `allowance.spend`): present only when something is.
   * An incomplete operation is described under `blankOperations` until its blanks are filled.
   */
  readonly blanks?: Readonly<Record<string, ReadonlyArray<string>>>;
  /** Where the application runs, by name: present only when the blueprint has an `environments/` folder. */
  readonly environments?: Readonly<Record<string, EnvironmentModel>>;
  /** Each mount, by its name: present only when the blueprint has a mount. */
  readonly mounts?: Readonly<Record<string, MountModel>>;
  /** The alert rules the model implies (K18), sorted by id. The portal evaluates them and a sink writes them. */
  readonly alertRules: ReadonlyArray<AlertRuleModel>;
}

/** A blueprint the compiler refuses, with every problem found, each naming its file. */
export class BlueprintInvalid extends Data.TaggedError("BlueprintInvalid")<{ readonly problems: ReadonlyArray<string> }> {}

export interface CompilerApi {
  /** Load the blueprint and build its model. */
  readonly model: Effect.Effect<Model, BlueprintInvalid | SourceError, BlueprintSource>;
}
