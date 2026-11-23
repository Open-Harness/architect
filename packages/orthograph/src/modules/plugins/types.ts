// Plugins: a feature, an adapter or a projection, each a package whose root export is its descriptor, and the mount, one
// file in a project that says "use this plugin here, like this" (decisions/M1-plugins.md).
import type { Effect } from "effect";
import type { AnyErrorClass } from "#modules/errors/types.js";
import type { Operation, Read } from "#modules/operations/types.js";
import type { Value } from "#modules/values/types.js";

/** The ways a caller signs in (K1): only removed by a mount, never added. MCP is `agent`. */
export const Via = { session: "session", key: "key", device: "device", agent: "agent" } as const;
export type Via = (typeof Via)[keyof typeof Via];

/** Where a plugin's code or a projection's output runs. */
export const Host = { worker: "worker", node: "node", browser: "browser", world: "world" } as const;
export type Host = (typeof Host)[keyof typeof Host];

/** The doors a server opens, that a projection may call. */
export const Door = { api: "server.api", mcp: "server.mcp" } as const;
export type Door = (typeof Door)[keyof typeof Door];

/** How a projection's output reaches the world: run at a place, handed to others under a tag, or kept in the repository. */
export const Ships = { deploy: "deploy", release: "release", kept: "kept" } as const;
export type Ships = (typeof Ships)[keyof typeof Ships];

/** One option of a choice: an object, compared by identity. */
export interface Option<K extends string = string> {
  readonly kind: "option";
  readonly key: K;
  readonly choice: AnyChoice;
}

/** Any choice, whatever its options. */
export interface AnyChoice {
  readonly kind: "choice";
  readonly options: Readonly<Record<string, string>>;
}

/** A pick among options a plugin has proved, each with what it means. The first option is the default. */
export type Choice<K extends string = string> = {
  readonly kind: "choice";
  readonly options: { readonly [P in K]: string };
} & { readonly [P in K]: Option<K> };

/** A plugin's choices: choices, or plain objects of them (`signer.node`). A module namespace is one too. */
export interface Choices {
  readonly [name: string]: AnyChoice | Choices;
}

/** Every option of every choice in a plugin's choices. */
export type OptionsIn<C> = {
  [P in keyof C]: C[P] extends { readonly kind: "choice"; readonly options: infer O } ? Option<keyof O & string> : C[P] extends object ? OptionsIn<C[P]> : never;
}[keyof C];

/** A value each environment gives (shape only in M1: the model and runtime read it in a later slice). */
export interface Setting {
  readonly kind: "setting";
  readonly shape: "one" | "list";
  readonly value: Value;
  readonly min?: number;
}

/** A call out of an adapter. Its argument and answer come from the callable in the adapter's `src/calls/`, never retyped. */
export interface Call<M extends "promise" | "effect" = "promise" | "effect"> {
  readonly kind: "call";
  readonly mode: M;
  readonly errors: ReadonlyArray<AnyErrorClass>;
}

/** What an adapter's `calls` answers for a name it has no call by: a mount's `include` and a step name it, and the compiler refuses. */
export interface MissingCall {
  readonly kind: "missing-call";
  readonly name: string;
}

/** What stands in for an adapter's outside system in a world, said honestly. */
export type StandIn =
  | { readonly kind: "stand-in"; readonly how: "process" | "vendor"; readonly what: string }
  | { readonly kind: "stand-in"; readonly how: "none" };

interface Described<C> {
  /** One sentence: what it gives. */
  readonly description: string;
  readonly choices?: C;
}

export interface FeatureSpec<C extends Choices = Choices> extends Described<C> {
  readonly needs?: ReadonlyArray<Need>;
  readonly settings?: Readonly<Record<string, Setting>>;
  /** What it offers an app's handlers, as steps (M1.14). */
  readonly exports?: Readonly<Record<string, unknown>>;
}

export interface AdapterSpec<C extends Choices = Choices, Ca extends Readonly<Record<string, Call>> = Readonly<Record<string, Call>>> extends Described<C> {
  readonly host?: ReadonlyArray<Host>;
  readonly calls?: Ca;
  readonly events?: Readonly<Record<string, unknown>>;
  readonly needs?: ReadonlyArray<Need>;
  readonly settings?: Readonly<Record<string, Setting>>;
  readonly standIn?: StandIn;
}

/** An operation as a projection sees it in the model: enough to decide whether it takes it. */
export interface ProjectedOperation {
  readonly name: string;
  readonly runs: string;
  readonly allowed: ReadonlyArray<unknown>;
  readonly via?: ReadonlyArray<Via>;
  /** Whether the MCP door lists it: some `allowed` entry admits an agent, and a mount's narrowing keeps `agent`. */
  readonly agentTool?: boolean;
}

/**
 * What a projection renders from (frame/projections.md section 1): the project's name, the model, this mount's name, and
 * every mount of the model by name. The model is the compiler's, which `orthograph` cannot import: a projection that
 * reads it types it itself. The environments are in the model.
 */
export interface ProjectionInput {
  /** The project's name, from its folder: `examples/acme` is `acme`. */
  readonly name: string;
  readonly model: unknown;
  /** This mount's name: its file's name, and the folder it writes, `generated/<mount>/`. */
  readonly mount: string;
  /** The model's `mounts`, by name (empty when it has none). */
  readonly mounts: Readonly<Record<string, unknown>>;
}

/** One file a projection writes: its path is relative to `generated/<mount>/`, and the projection never names that folder. */
export interface Output {
  readonly path: string;
  readonly content: string;
}

export interface ProjectionSpec<C extends Choices = Choices> extends Described<C> {
  readonly host: ReadonlyArray<Host>;
  readonly builtOn?: Projection<any>;
  readonly reaches?: Door;
  readonly via?: ReadonlyArray<Via>;
  readonly takes?: (op: ProjectedOperation) => boolean;
  readonly render: (project: ProjectionInput) => Effect.Effect<ReadonlyArray<Output>, unknown>;
  readonly replay?: (step: unknown, world: unknown) => Effect.Effect<unknown, unknown>;
  readonly ships: ReadonlyArray<Ships>;
}

export type Feature<C extends Choices = Choices> = Omit<FeatureSpec<C>, "choices"> & { readonly kind: "feature"; readonly choices: C };
export type Adapter<C extends Choices = Choices, Ca extends Readonly<Record<string, Call>> = Readonly<Record<string, Call>>> =
  Omit<AdapterSpec<C, Ca>, "choices" | "calls"> & { readonly kind: "adapter"; readonly choices: C; readonly calls: Ca };
export type Projection<C extends Choices = Choices> = Omit<ProjectionSpec<C>, "choices"> & { readonly kind: "projection"; readonly choices: C };
export type Plugin = Feature<any> | Adapter<any, any> | Projection<any>;

/** A plugin this one needs mounted beside it, only when the mount picked `when`. */
export interface NeedWhen {
  readonly kind: "need";
  readonly plugin: Feature<any> | Adapter<any, any>;
  readonly when?: Option<any>;
}
export type Need = Feature<any> | Adapter<any, any> | NeedWhen;

/** One verb of a mount. */
export type Verb =
  | { readonly kind: "verb"; readonly verb: "choose"; readonly option: Option<any> }
  | { readonly kind: "verb"; readonly verb: "include"; readonly items: ReadonlyArray<unknown> }
  | { readonly kind: "verb"; readonly verb: "narrow"; readonly operation: Operation | Read; readonly via: ReadonlyArray<Via> }
  | { readonly kind: "verb"; readonly verb: "omit"; readonly operation: Operation | Read };

/** What a mount's callback is given: the plugin's choices and the verbs its kind allows, bound to it. */
export type ViewOf<P> =
  P extends Feature<infer C> ? {
    readonly choices: C;
    readonly choose: (option: OptionsIn<C>) => Verb;
    readonly narrow: (operation: Operation | Read, spec: { readonly via: ReadonlyArray<Via> }) => Verb;
    readonly omit: (operation: Operation | Read) => Verb;
  }
  : P extends Adapter<infer C, infer Ca> ? {
    readonly choices: C;
    readonly calls: Ca;
    readonly choose: (option: OptionsIn<C>) => Verb;
    readonly include: (...items: ReadonlyArray<Ca[keyof Ca] | unknown>) => Verb;
  }
  : P extends Projection<infer C> ? {
    readonly choices: C;
    readonly choose: (option: OptionsIn<C>) => Verb;
  }
  : never;

/** The calls an adapter offers, which a mounted adapter's file hands to the operations that call them. */
export type CallsOf<P> = P extends Adapter<any, infer Ca> ? Ca : {};

/**
 * A mount: the plugin and what the app chose of it. It has no name: its file's name is the mount's. `calls` is the
 * adapter's, so an operation writes `Blueprint.step.call(pricing.calls.quote)`; the compiler refuses a call the mount
 * did not `include`.
 */
export interface Mount<P extends Plugin = Plugin> {
  readonly kind: "mount";
  readonly plugin: P;
  readonly verbs: ReadonlyArray<Verb>;
  readonly calls: CallsOf<P>;
}

export interface PluginsApi {
  readonly feature: <const C extends Choices = {}>(spec: FeatureSpec<C>) => Feature<C>;
  readonly adapter: <const C extends Choices = {}, const Ca extends Readonly<Record<string, Call>> = {}>(spec: AdapterSpec<C, Ca>) => Adapter<C, Ca>;
  readonly projection: <const C extends Choices = {}>(spec: ProjectionSpec<C>) => Projection<C>;
  readonly choice: <const O extends Readonly<Record<string, string>>>(options: O) => Choice<keyof O & string>;
  readonly need: (plugin: Feature<any> | Adapter<any, any>, spec?: { readonly when?: Option<any> }) => NeedWhen;
  readonly call: <const M extends "promise" | "effect" = "promise">(spec?: { readonly mode?: M; readonly errors?: ReadonlyArray<AnyErrorClass> }) => Call<M>;
  readonly setting: {
    readonly one: (value: Value) => Setting;
    readonly list: (value: Value, spec?: { readonly min?: number }) => Setting;
  };
  readonly use: <P extends Plugin>(plugin: P, verbs?: (view: ViewOf<P>) => ReadonlyArray<Verb>) => Mount<P>;
}

export interface StandApi {
  /** A real program run locally that speaks the real protocol (Anvil, Mailpit, another app's world). */
  readonly process: (what: string) => StandIn;
  /** The vendor's own local or test service (stripe-mock). */
  readonly vendor: (what: string) => StandIn;
  /** Nothing stands in locally: its journeys run only in the cloud pass. */
  readonly none: StandIn;
}
