import { Effect } from "effect";
import type { FileError, ReadInput, WriteInput } from "../types.ts";
import type { Shared } from "./live.ts";
import { inside, liveOf } from "./lookup.ts";

/** A file written inside the sandbox's folder (its folders made), or `OutsideSandbox`. */
export const writeIn = (shared: Shared, input: WriteInput): Effect.Effect<{ readonly bytes: number }, FileError> =>
  Effect.gen(function* () {
    const live = yield* liveOf(shared, input.sandbox);
    const path = yield* inside(live, input.path);
    return { bytes: yield* shared.disk.write(path, input.content) };
  });

/** A file read from inside the sandbox's folder, or `OutsideSandbox`. */
export const readIn = (shared: Shared, input: ReadInput): Effect.Effect<{ readonly content: string }, FileError> =>
  Effect.gen(function* () {
    const live = yield* liveOf(shared, input.sandbox);
    const path = yield* inside(live, input.path);
    return { content: yield* shared.disk.read(path) };
  });
