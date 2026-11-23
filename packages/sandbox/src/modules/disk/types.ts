import { Data, type Effect } from "effect";

/** A disk call that failed for a reason other than the path being missing. */
export class DiskFailed extends Data.TaggedError("DiskFailed")<{ readonly path: string; readonly code: string }> {}

export interface Disk {
  /** The real path of an existing path (symbolic links followed), or null when nothing is there. */
  readonly realpath: (path: string) => Effect.Effect<string | null>;
  /** Whether a symbolic link is at this path itself, resolving or not (a dangling or looping one is still a link). */
  readonly isLink: (path: string) => Effect.Effect<boolean>;
  /** Make a folder and the missing ones above it. */
  readonly makeDir: (path: string) => Effect.Effect<void, DiskFailed>;
  /** Write a file, making its folder; `mode` is a permission such as 0o755. Answers the bytes written. */
  readonly write: (path: string, content: string, mode?: number) => Effect.Effect<number, DiskFailed>;
  readonly read: (path: string) => Effect.Effect<string, DiskFailed>;
  /** A file's text, or "" when it is not there. */
  readonly readOrEmpty: (path: string) => Effect.Effect<string>;
  /** The names in a folder, in order; none when it is not there. */
  readonly names: (path: string) => Effect.Effect<ReadonlyArray<string>>;
  /** Remove a file or a folder and what is in it. Nothing there is not a failure. */
  readonly remove: (path: string) => Effect.Effect<void>;
}
