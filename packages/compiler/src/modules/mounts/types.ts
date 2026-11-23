// Mounts: a project's `blueprint/{features,adapters,projections}/<name>.ts`, each matched to the installed plugin it
// imports, its choices checked, and a feature's things folded in under the mount's name (M1-plugins sections 4 to 7).
import type { Effect } from "effect";
import type { Agent, SourceKind } from "orthograph";
import type { BlueprintSource } from "#modules/source/types.js";
import type { Layout, StoreFile, ThingFiles } from "#modules/model/internal/layout.js";

/** What a mount adds to the model, by the mount's name. */
export interface MountModel {
  readonly kind: "feature" | "adapter" | "projection";
  readonly file: string;
  readonly package: string;
  readonly version: string;
  /** `sha256-…` over the installed package's files: changed bytes at the same version change it. */
  readonly integrity: string;
  /** Each choice by its path in the plugin's choices, and the option picked: chosen, or the first. */
  readonly chosen: Readonly<Record<string, string>>;
  readonly omitted?: ReadonlyArray<string>;
  readonly narrowed?: Readonly<Record<string, ReadonlyArray<string>>>;
  readonly needs?: ReadonlyArray<string>;
  /** An adapter's calls this mount includes, by the adapter's name for each: the only ones an operation may call. */
  readonly calls?: ReadonlyArray<string>;
  /** An adapter's events this mount includes, by the adapter's name for each: the only ones its door accepts. */
  readonly events?: ReadonlyArray<string>;
  /** An adapter whose door receives events this mount includes: the name of its signing secret in an environment, `<MOUNT>_WEBHOOK_SIGNING`. The Worker serves `/_in/<mount>` for it. */
  readonly door?: { readonly secret: string };
  /** An adapter that ships a `layer.js`: the services its calls need, provided to its calls and to nothing else. */
  readonly layer?: true;
  /** What stands in for an adapter's outside system in a world, as the adapter declared it. */
  readonly standIn?: { readonly how: "process" | "vendor" | "none"; readonly what?: string };
  readonly hash: string;
}

/** Where an adapter's call is: its mount and its name there, and whether the mount includes it. */
export interface CallReach {
  readonly mount: string;
  readonly file: string;
  readonly package: string;
  readonly call: string;
  readonly included: boolean;
}

export interface BroughtAgent {
  /** Relative to the plugin: `blueprint/agents/<name>.ts`. */
  readonly file: string;
  readonly declaration: Agent;
  readonly mount: string;
}
export interface BroughtSource {
  readonly file: string;
  readonly declaration: SourceKind<any>;
  readonly exportName: string;
  readonly mount: string;
  readonly package: string;
}

export interface Folded {
  /** The plugins' things, under their final names, each with `from`. */
  readonly things: ReadonlyMap<string, ThingFiles>;
  readonly journeys: Layout["journeys"];
  /** The plugins' stores, named by the mount and the store's path, each with `from`. */
  readonly stores: ReadonlyMap<string, StoreFile>;
  readonly mounts: Readonly<Record<string, MountModel>>;
  /** Every call of every mounted adapter, by the call object an operation's step holds. */
  readonly calls: ReadonlyMap<unknown, CallReach>;
  /** The agent kinds the features bring, by the file's name, each with the mount that brought it. */
  readonly agents: ReadonlyMap<string, BroughtAgent>;
  /** The source kinds the features bring, by the file's name. */
  readonly sources: ReadonlyMap<string, BroughtSource>;
  readonly problems: ReadonlyArray<string>;
}

export interface MountsApi {
  /** Match each mount in the layout to its installed plugin and fold the plugin in. Problems name the mount's file. */
  readonly fold: (layout: Layout) => Effect.Effect<Folded, never, BlueprintSource>;
  /** Each problem that names a plugin's path, prefixed with the mount file that brought the plugin in. */
  readonly attributed: (problems: ReadonlyArray<string>, mounts: Readonly<Record<string, MountModel>>) => ReadonlyArray<string>;
}
