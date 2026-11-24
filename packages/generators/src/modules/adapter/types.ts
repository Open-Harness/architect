// An adapter generated from a service's own published description (an OpenAPI 3.x or Swagger 2.0 document): what goes in,
// what comes out, and why a document is refused (design/frame/adapters.md, "Writing an adapter").
import { Data, type Effect } from "effect";

/** One file of the plugin, its path relative to the plugin's folder. A generated file is always put back; a scaffold only when it is absent. */
export interface PluginFile {
  readonly path: string;
  readonly content: string;
  readonly how: "generated" | "scaffold";
}

/** What was made: the counts the command prints, and the files. */
export interface GeneratedAdapter {
  readonly title: string;
  readonly version: string;
  readonly calls: number;
  readonly events: number;
  readonly files: ReadonlyArray<PluginFile>;
}

/** The document can't make an adapter. The message says why, in the words the command prints. */
export class AdapterRefused extends Data.TaggedError("AdapterRefused")<{ readonly message: string }> {}

export interface AdapterApi {
  /** A plugin's files from a parsed description: pure, and the same bytes for the same document whatever its path or format. */
  readonly generate: (input: { readonly name: string; readonly spec: unknown }) => Effect.Effect<GeneratedAdapter, AdapterRefused>;
  /** Whether a plugin name is lower case words joined by dashes. */
  readonly isName: (name: string) => boolean;
}
