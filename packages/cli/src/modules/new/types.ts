// `ortho new adapter <name> --from-openapi <file or URL>`: a plugin generated from a service's own published description.
import { Data, type Effect } from "effect";

/** Nothing was written: the message says what is wrong with the name, the description or where it was to be read from. */
export class NewRefused extends Data.TaggedError("NewRefused")<{ readonly message: string }> {}

export interface NewApi {
  /**
   * Reads the description (a file, or an http(s) URL; JSON or YAML), makes the adapter and writes it to
   * `<root>/plugins/<name>/`: every generated file put back, a scaffold only where there is none. Nothing is written
   * unless the whole plugin could be made. The last line says what was made.
   */
  readonly adapter: (input: { readonly root: string; readonly name: string; readonly from: string }) => Effect.Effect<ReadonlyArray<string>, NewRefused>;
}
