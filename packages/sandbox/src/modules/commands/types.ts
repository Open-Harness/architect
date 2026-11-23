import { Data, type Effect } from "effect";
import type { DiskFailed, Disk } from "../disk/types.ts";

/** A command that is on the sandbox's blocked list. `command` is the program's name. */
export class BlockedCommand extends Data.TaggedError("BlockedCommand")<{ readonly command: string }> {}

/** A blocked name that is a path, has an argument, or is not a program name. */
export class InvalidBlocked extends Data.TaggedError("InvalidBlocked")<{ readonly program: string }> {}

export interface CommandsApi {
  /** The blocked program an argv starts with (its basename), or undefined. */
  readonly firstBlocked: (command: ReadonlyArray<string>, blocked: ReadonlyArray<string>) => string | undefined;
  /** Write one shim per blocked name into `shims`, and make the `hits` log. */
  readonly install: (disk: Disk, shims: string, blocked: ReadonlyArray<string>) => Effect.Effect<void, InvalidBlocked | DiskFailed>;
  /** The blocked names a shim logged, in order. */
  readonly hitsFrom: (log: string) => ReadonlyArray<string>;
  /** The line a refusal prints, and a Pi tool's result starts with. */
  readonly refusalText: (name: string) => string;
  readonly hitsFile: (shims: string) => string;
}
