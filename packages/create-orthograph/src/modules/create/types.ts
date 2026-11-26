// What `create-orthograph [name]` does with the words after its name: the one app it makes, or the refusal.
import type { Effect } from "effect";
import type { AppRefused } from "@orthograph/preset";

export interface CreateApi {
  /** Makes the app named in `args` in `parent`, and returns what to print. `--help` returns the usage instead. */
  readonly run: (input: { readonly args: ReadonlyArray<string>; readonly parent: string }) => Effect.Effect<ReadonlyArray<string>, AppRefused>;
}
