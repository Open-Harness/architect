import type { ClockDeclaration, ClockEnv, WorldClockApi } from "./types.ts";
import { clockDoor } from "./internal/door.ts";
import { inEntry, install, inWorld, refresh, release, wall } from "./internal/date.ts";
import { stateOf } from "./internal/state.ts";

const REAL: ClockDeclaration = { kind: "real" };

/** Each environment's clock, from `ORTHO_CLOCKS`. Anything that does not read as a clock is real: a world never guesses. */
const clocksOf = (env: ClockEnv): Readonly<Record<string, unknown>> => {
  if (!env.ORTHO_CLOCKS) return {};
  const parsed = JSON.parse(env.ORTHO_CLOCKS) as unknown;
  return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
};

const declaredIn = (declared: unknown): ClockDeclaration => {
  const clock = declared as { readonly kind?: unknown; readonly starts?: unknown; readonly speed?: unknown } | undefined;
  if (clock?.kind === "stepped" && typeof clock.starts === "string") return { kind: "stepped", starts: clock.starts };
  if (clock?.kind === "scaled" && typeof clock.starts === "string" && typeof clock.speed === "number") return { kind: "scaled", starts: clock.starts, speed: clock.speed };
  return REAL;
};

export const WorldClock: WorldClockApi = {
  // A world made by `ortho dev` or a prove run has no environment name set beyond `local`; a name nothing declares is real.
  declared: (env) => declaredIn(clocksOf(env)[env.ORTHO_ENVIRONMENT || "local"]),
  state: stateOf,
  door: clockDoor,
  within: (instant, f) => {
    install();
    return inWorld(instant, f);
  },
  entered: (source, owner, f, leave) => {
    install();
    return inEntry(source, owner, f, leave);
  },
  release,
  refresh,
  wall,
};
