import { Effect } from "effect";
import { Fence } from "../../fence/service.ts";
import type { OutsideSandbox } from "../../fence/types.ts";
import { SandboxGone } from "../types.ts";
import type { Live, Shared } from "./live.ts";

export const gone = (sandbox: string): SandboxGone => new SandboxGone({ sandbox });

/** An open sandbox by id, or `SandboxGone`: closed, swept, or never opened. */
export const liveOf = (shared: Shared, id: string): Effect.Effect<Live, SandboxGone> => {
  const live = shared.all.get(id);
  return live !== undefined && live.state === "open" ? Effect.succeed(live) : Effect.fail(gone(id));
};

/** The absolute path to use for `path` in this sandbox, or `OutsideSandbox`, which is also recorded as a refusal. */
export const inside = (live: Live, path: string): Effect.Effect<string, OutsideSandbox> =>
  live.fence.check(path).pipe(Effect.tapError((refusal) => Effect.sync(() => void live.refusals.push({ name: "OutsideSandbox", detail: Fence.refusalText(refusal) }))));
