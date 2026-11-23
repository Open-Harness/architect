import { Data, type Effect } from "effect";
import type { Disk } from "../disk/types.ts";

/** A path that resolves outside the sandbox's root. `path` is what was asked, `resolved` where it really lands. */
export class OutsideSandbox extends Data.TaggedError("OutsideSandbox")<{ readonly path: string; readonly root: string; readonly resolved: string }> {}

export interface Fence {
  /** The root the sandbox was made in, as given. */
  readonly root: string;
  /** The absolute path to use for `target` (relative paths are the root's), or `OutsideSandbox`. */
  readonly check: (target: string) => Effect.Effect<string, OutsideSandbox>;
}

export interface FenceApi {
  readonly of: (disk: Disk, root: string) => Effect.Effect<Fence>;
  /** `OutsideSandbox: <path> is outside <root>`: what a Pi tool's error result starts with. */
  readonly refusalText: (refusal: OutsideSandbox) => string;
}
