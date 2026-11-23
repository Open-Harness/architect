// Where blueprint files come from: listed under a root, and loaded as modules. The compiler sees only this.
import { Context, Data, type Effect } from "effect";

export class SourceError extends Data.TaggedError("SourceError")<{ readonly message: string }> {}

/** One blueprint file: its path under `blueprint/`, with forward slashes, and what it exports. */
export interface LoadedFile {
  readonly path: string;
  readonly exports: Readonly<Record<string, unknown>>;
  readonly sourceHash?: string;
}

/**
 * An installed package the project depends on whose `package.json` has an `orthograph` key (M1-plugins section 1): a
 * plugin. `descriptor` is its root export, the same object a mount imports. `problem` says why it can't be used.
 */
export interface PluginPackage {
  readonly name: string;
  readonly version: string;
  readonly kind: string;
  readonly descriptor: unknown;
  /** Every plugin descriptor its root export holds, by export name: a package that ships several (`@orthograph/projections`) has no default. */
  readonly descriptors?: Readonly<Record<string, unknown>>;
  readonly problem?: string;
}

/** A plugin's declarations: each `.js` under its declared `blueprint` folder, and a digest of the installed package. */
export interface PluginFiles {
  /** `sha256-…` over every file of the installed package: its path inside the package, and its bytes. */
  readonly integrity: string;
  /** Whether its declared `src` folder has a `layer.js`: the services its handlers and calls need. */
  readonly layer?: boolean;
  /** `path` is relative to the blueprint folder (`things/echo/thing.js`); `specifier` is how code imports it. */
  readonly files: ReadonlyArray<LoadedFile & { readonly specifier: string }>;
}

export class BlueprintSource extends Context.Service<BlueprintSource, {
  /** Blueprint files and root journeys, sorted, with paths relative to `blueprint/`. */
  readonly list: Effect.Effect<ReadonlyArray<string>, SourceError>;
  /** Import one file by its relative path. Blueprint files must have no side effects on import. */
  readonly load: (path: string) => Effect.Effect<LoadedFile, SourceError>;
  /** The text of `blueprint/refusals.lock` (M6-chain item 4), or undefined when the project has none yet. A source with no lock to give leaves this out. */
  readonly lock?: Effect.Effect<string | undefined, SourceError>;
  /** The plugins among the project's dependencies, by package name. */
  readonly plugins: Effect.Effect<ReadonlyArray<PluginPackage>, SourceError>;
  /** One plugin's declarations, loaded from where the project resolves them. Fails naming the package when it can't. */
  readonly pluginFiles: (name: string) => Effect.Effect<PluginFiles, SourceError>;
}>()("@orthograph/compiler/BlueprintSource") {}
