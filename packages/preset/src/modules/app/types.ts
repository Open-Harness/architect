// `ortho new app <name>` and `npm create orthograph <name>`: the starter project, made as a folder of its own.
import { Data, type Effect } from "effect";

/** Nothing was written: the message says what is wrong with the name or the folder, and names it. */
export class AppRefused extends Data.TaggedError("AppRefused")<{ readonly message: string }> {}

export interface AppApi {
  /**
   * Makes `<parent>/<name>/` the way `create-nx-workspace <name> --preset=@orthograph/preset` would, without installing
   * anything and without touching anything outside that folder. An existing empty folder is filled; a folder with anything
   * in it (a hidden file too), or a file in its place, is refused untouched, and so is a name that is not lower case words
   * joined by dashes, or is one a package of that name would clash with. The lines say what was made and what to do next.
   */
  readonly create: (input: { readonly parent: string; readonly name: string }) => Effect.Effect<ReadonlyArray<string>, AppRefused>;
  /** The one name in `args` (the words after the command), or why there isn't one: none, or an extra word, named. */
  readonly nameIn: (args: ReadonlyArray<string>) => Effect.Effect<string, AppRefused>;
  /** Whether `name` is one an app can have. */
  readonly isName: (name: string) => boolean;
}
