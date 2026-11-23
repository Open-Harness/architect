import { Effect } from "effect";
import { LockInvalid, type Lock, type LockApi } from "./types.ts";
import { assign, evolve } from "./internal/evolve.ts";
import { runtimeWanted } from "./internal/runtime.ts";

export const EMPTY_LOCK: Lock = { refusals: {}, retired: {} };
const EMPTY = EMPTY_LOCK;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

export const HEADER = "Generated from blueprint/. Append-only. Do not edit.";

export const RefusalLock: LockApi = {
  parse: (text) =>
    text === undefined
      ? Effect.succeed(EMPTY)
      : Effect.try({ try: (): unknown => JSON.parse(text), catch: () => new LockInvalid({ message: "is not JSON" }) }).pipe(
          Effect.flatMap((parsed) =>
            isRecord(parsed) && parsed["lockVersion"] === 1 && isRecord(parsed["refusals"]) && isRecord(parsed["retired"])
              ? Effect.succeed({ refusals: parsed["refusals"] as Lock["refusals"], retired: parsed["retired"] as Lock["retired"] })
              : Effect.fail(new LockInvalid({ message: "is not a refusals lock of lockVersion 1" })),
          ),
        ),
  evolve,
  assign,
  runtime: runtimeWanted,
  text: (lock) => `${JSON.stringify({ generated: HEADER, lockVersion: 1, refusals: lock.refusals, retired: lock.retired }, null, 2)}\n`,
  codes: (lock) => Object.fromEntries(Object.entries(lock.refusals).map(([code, e]) => [e.name, code])),
};
