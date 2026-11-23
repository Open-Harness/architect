// What every renderer here shares: the file it hands back, and the one refusal a projection has of its own.
import { Data } from "effect";

/** A file a renderer makes. `path` is relative to the project root, with forward slashes. */
export interface RenderedFile {
  readonly path: string;
  readonly content: string;
  /** A scaffold: written once if absent, then the project's own. Everything else is regenerated every time. */
  readonly scaffold: boolean;
}

/** A projection mounted where its output can't be: the tooling reads `generated/<folder>/`, so the mount must be named for it. */
export class MountedElsewhere extends Data.TaggedError("MountedElsewhere")<{ readonly message: string }> {}
