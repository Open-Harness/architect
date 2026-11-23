// The portal's wire: one versioned JSON document, made from the compiler's model and the generated docs, which the app
// reads instead of any project source (F1 §1, D3 #130). Plain data; no Effect in what the browser holds.
import { Data, type Effect, Schema } from "effect";

/** Bumped only when a core meaning changes; an addition is an extension key, which a reader ignores when it does not know it. */
export const SCHEMA_VERSION = 1 as const;

export type Availability<T> =
  | { readonly state: "available"; readonly value: T }
  | { readonly state: "unavailable"; readonly reason: string };

const Field = Schema.Struct({
  value: Schema.Record(Schema.String, Schema.Unknown),
  named: Schema.optionalKey(Schema.String),
  ref: Schema.optionalKey(Schema.String),
  optional: Schema.optionalKey(Schema.Boolean),
  /** What the field is, in the declaration's own words (`Blueprint.described`; M1.42). */
  description: Schema.optionalKey(Schema.String),
  /** Who may see its value, as the model has it: `"secret"`, or `{ private: [roles] }`; absent means public. The wire holds declarations, never values. */
  visibility: Schema.optionalKey(Schema.Union([Schema.Literal("secret"), Schema.Struct({ private: Schema.Array(Schema.String) })])),
  /** A secret answer field handed to its caller once (`Blueprint.issued`). */
  issued: Schema.optionalKey(Schema.Literal(true)),
});
const Fields = Schema.Record(Schema.String, Field);

/** What a proof's dependencies are worked out from: hashes, field refs and roles. Every model the logbook holds has this much, or is unsupported. */
const CoreField = Schema.Struct({ ref: Schema.optionalKey(Schema.String) });
const CoreFields = Schema.Record(Schema.String, CoreField);
export const ModelCore = Schema.Struct({
  things: Schema.Record(Schema.String, Schema.Struct({ hash: Schema.String, fields: CoreFields })),
  operations: Schema.Record(Schema.String, Schema.Struct({
    thing: Schema.String,
    hash: Schema.String,
    payload: CoreFields,
    answer: CoreFields,
    allowed: Schema.Array(Schema.Struct({ kind: Schema.String, role: Schema.optionalKey(Schema.String) })),
  })),
});
export type ModelCore = typeof ModelCore.Type;

const Operation = Schema.Struct({
  kind: Schema.Literals(["operation", "read"]),
  name: Schema.String,
  thing: Schema.String,
  verb: Schema.String,
  description: Schema.String,
  payload: Fields,
  answer: Fields,
  move: Schema.NullOr(Schema.Struct({ key: Schema.String, from: Schema.Array(Schema.String), to: Schema.Array(Schema.String), emits: Schema.String })),
  errors: Schema.Array(Schema.String),
  /** Each refusal the runtime makes for a rule, to the rule's full name (`HandleTaken` to `handle.oneHolderPerName`, G5); absent when the operation breaks none. These refusals are also in `refusals`. */
  invariants: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  /** Every rule the operation can break, as `<thing>.<rule>`, whether or not it owns a refusal (S31); absent on an older wire. */
  breaks: Schema.optionalKey(Schema.Array(Schema.String)),
  refusals: Schema.Array(Schema.String),
  allowed: Schema.Array(Schema.Struct({ kind: Schema.String, role: Schema.optionalKey(Schema.String), path: Schema.optionalKey(Schema.String) })),
  steps: Schema.Record(Schema.String, Schema.Struct({ name: Schema.String, type: Schema.String })),
  idempotent: Schema.NullOr(Schema.Literal("request")),
  budget: Schema.NullOr(Schema.Struct({ p95Ms: Schema.Number })),
  hash: Schema.String,
  /** The file that declares it, which is its owner (K18); absent on a wire older than M1.49. */
  file: Schema.optionalKey(Schema.String),
  /** Where it lives and how it is tested and run (M1.42). */
  from: Schema.optionalKey(Schema.Unknown),
  runs: Schema.optionalKey(Schema.String),
  test: Schema.optionalKey(Schema.String),
});

const Thing = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  fields: Fields,
  lives: Schema.Literals(["database", "actor"]),
  machine: Schema.NullOr(Schema.Struct({
    states: Schema.Array(Schema.String),
    moves: Schema.Record(Schema.String, Schema.Struct({ from: Schema.Array(Schema.String), to: Schema.Array(Schema.String), emits: Schema.String })),
    notFrom: Schema.Struct({ error: Schema.String, exit: Schema.Number }),
  })),
  roles: Schema.Array(Schema.String),
  hash: Schema.String,
  /** The model's own (M1.42): the code prefix, the events with their fields, and each error with its fields, exit and code. */
  code: Schema.optionalKey(Schema.String),
  events: Schema.optionalKey(Schema.Record(Schema.String, Fields)),
  errors: Schema.optionalKey(Schema.Record(Schema.String, Schema.Struct({ fields: Fields, exit: Schema.Number, code: Schema.String }))),
  /** Its rules by name (G5): what stays true among its instances. A rule's hash is the thing's `hash`, which they are part of. Absent when it has none. */
  invariants: Schema.optionalKey(Schema.Record(Schema.String, Schema.Struct({
    kind: Schema.Literal("unique"),
    fields: Schema.Array(Schema.String),
    while: Schema.optionalKey(Schema.Array(Schema.String)),
    refuse: Schema.optionalKey(Schema.String),
    description: Schema.optionalKey(Schema.String),
  }))),
});

const Environment = Schema.Struct({
  name: Schema.String,
  runs: Schema.String,
  promotesFrom: Schema.NullOr(Schema.String),
  lifetimeMs: Schema.NullOr(Schema.Number),
  identity: Schema.optionalKey(Schema.String),
  cloud: Schema.optionalKey(Schema.NullOr(Schema.Record(Schema.String, Schema.Unknown))),
  database: Schema.optionalKey(Schema.NullOr(Schema.String)),
  secrets: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  telemetry: Schema.optionalKey(Schema.Array(Schema.Record(Schema.String, Schema.Unknown))),
  file: Schema.optionalKey(Schema.String),
  deploy: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  publish: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  hash: Schema.optionalKey(Schema.String),
});

/** A journey as the compiler writes it: its cast, where it starts, and its declared steps (never read from spans). Checks are kept as written. */
const JourneyStep = Schema.Union([
  Schema.Struct({
    title: Schema.String,
    call: Schema.Struct({ actor: Schema.String, operation: Schema.String, payload: Schema.optionalKey(Schema.Unknown), request: Schema.optionalKey(Schema.String) }),
    checks: Schema.Array(Schema.Unknown),
  }),
  /** A step whose operation is outside the model (`storiesOf`): it names why it was not drawn, and has no call and no checks. */
  Schema.Struct({ title: Schema.String, skipped: Schema.String }),
]);
const Journey = Schema.Struct({
  name: Schema.String,
  file: Schema.String,
  cast: Schema.Record(Schema.String, Schema.Unknown),
  starts: Schema.NullOr(Schema.String),
  steps: Schema.Array(JourneyStep),
  sourceHash: Schema.optionalKey(Schema.String),
});

const StartingWorld = Schema.Struct({
  name: Schema.String,
  file: Schema.String,
  from: Schema.NullOr(Schema.String),
  cast: Schema.Record(Schema.String, Schema.Unknown),
  makes: Schema.Array(Schema.Unknown),
  gives: Schema.Record(Schema.String, Schema.Unknown),
  sourceHash: Schema.optionalKey(Schema.String),
});

const Mount = Schema.Struct({ kind: Schema.String, package: Schema.String, version: Schema.String, file: Schema.String, chosen: Schema.Record(Schema.String, Schema.Unknown), integrity: Schema.optionalKey(Schema.String), hash: Schema.optionalKey(Schema.String) });

/** One burn alert of an objective: it fires when the objective burns at `burn` or more over both windows, long then short. */
const BurnAlert = Schema.Struct({ name: Schema.String, burn: Schema.Number, windowsMs: Schema.Array(Schema.Number), severity: Schema.String });
/** One alert condition the compiler derives (K18, M1.49): the labels are `environment` (`*` for every one), the subject, `severity` and `owner`. */
const AlertRule = Schema.Struct({
  id: Schema.String,
  kind: Schema.Literals(["latency", "defect", "anomaly", "verdict"]),
  labels: Schema.Record(Schema.String, Schema.String),
  target: Schema.optionalKey(Schema.Number),
  windowDays: Schema.optionalKey(Schema.Number),
  thresholdMs: Schema.optionalKey(Schema.Number),
  minCalls: Schema.optionalKey(Schema.Number),
  alerts: Schema.optionalKey(Schema.Array(BurnAlert)),
});
export type AlertRuleWire = typeof AlertRule.Type;

/** The compiler's model as far as the portal reads it. The digest is over the whole document, so what it does not read is still what it holds. */
export const ModelSchema = Schema.Struct({
  things: Schema.Record(Schema.String, Thing),
  operations: Schema.Record(Schema.String, Operation),
  environments: Schema.optionalKey(Schema.Record(Schema.String, Environment)),
  blanks: Schema.optionalKey(Schema.Record(Schema.String, Schema.Array(Schema.String))),
  /** Refusal name to its code (HandleTaken to HN-001): the table the calls table and the refusal-codes page map names through. */
  refusals: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  journeys: Schema.optionalKey(Schema.Record(Schema.String, Journey)),
  startingWorlds: Schema.optionalKey(Schema.Record(Schema.String, StartingWorld)),
  mounts: Schema.optionalKey(Schema.Record(Schema.String, Mount)),
  /** The alert rules the model implies (K18): what the monitor evaluates over the window. Absent on a wire older than M1.49. */
  alertRules: Schema.optionalKey(Schema.Array(AlertRule)),
});
export type ModelWire = typeof ModelSchema.Type;
export type OperationWire = ModelWire["operations"][string];
export type ThingWire = ModelWire["things"][string];
export type FieldWire = typeof Field.Type;

export type Depends = Readonly<Record<string, string>>;

export const BlueprintSchema = Schema.Struct({
  schemaVersion: Schema.Literal(SCHEMA_VERSION),
  project: Schema.String,
  /** Always null here: the generator never labels a model with a revision. The bundle that holds it names its own. */
  revision: Schema.NullOr(Schema.String),
  /** sha256 of the canonical text of everything else in this document. */
  digest: Schema.String,
  model: ModelSchema,
  /** Per operation: what its proof rests on, as `Compare.dependsOn` says (the adapter reaches the same). */
  dependsOnByOperation: Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.String)),
  /** The generated docs, as text: their path under `generated/docs`, and the Markdown. */
  docs: Schema.Record(Schema.String, Schema.String),
  /** Availability-tagged additions; a key a reader does not know is ignored. */
  extensions: Schema.Record(Schema.String, Schema.Unknown),
});
export type BlueprintWire = typeof BlueprintSchema.Type;

/** The blueprint is not one this reader accepts: its schema version is unknown, its digest is not its content's, or it is not a blueprint. */
export class BlueprintRejected extends Data.TaggedError("BlueprintRejected")<{ readonly reason: string }> {}
/** A model the logbook holds that this reader cannot judge a proof against. */
export class ModelUnsupported extends Data.TaggedError("ModelUnsupported")<{ readonly reason: string }> {}

export interface WireApi {
  /** The blueprint for `project`: deterministic (no clock, no revision), its digest set. */
  readonly build: (input: { readonly project: string; readonly model: ModelWire; readonly docs: Readonly<Record<string, string>> }) => BlueprintWire;
  /** Accept a blueprint only if its schema version is known, it fits, and its digest is its content's. */
  readonly decode: (json: unknown) => Effect.Effect<BlueprintWire, BlueprintRejected>;
  /** A model the logbook holds, as far as a proof's dependencies need it; unsupported shapes are an error, never a guess. */
  readonly core: (json: unknown) => Effect.Effect<ModelCore, ModelUnsupported>;
  /** What an operation's proof rests on: itself, its thing, the things its own or its thing's fields refer to, and the things whose roles may call it. Same as the compiler's `Compare.dependsOn`. */
  readonly dependsOn: (model: ModelCore, operation: string) => Depends;
  /** The current hash of a dependency key, or undefined when it no longer exists. Same as `Compare.hashOf`. */
  readonly hashOf: (model: ModelCore, key: string) => string | undefined;
  /** sha256 of the canonical text of a blueprint's content without its digest. */
  readonly digestOf: (unsigned: unknown) => string;
}
