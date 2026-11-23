import type { Machine, MachinesApi, Move, MoveSpec, State } from "./types.ts";
import { checkMoves } from "./internal/check.ts";
import { Blanks } from "#modules/blanks/service.js";

export const Machines: MachinesApi = {
  machine: (thing, spec) => {
    // States not written yet (`Blueprint.todo`) have nothing to check moves against.
    if (!Blanks.isBlank(spec.states)) checkMoves(spec.states, spec.moves as Record<string, MoveSpec<string>>);
    const moves: Record<string, Move> = {};
    const states: Record<string, State> = {};
    const machine = {
      kind: "machine", thing, states, declared: spec.states, moves, notFrom: undefined,
      isIn: (id: unknown, state: string) => Object.freeze({ kind: "is-in", thing, id, state }),
    } as unknown as Machine;
    if (!Blanks.isBlank(spec.states)) for (const key of spec.states) states[key] = Object.freeze({ kind: "state", machine, key });
    Object.freeze(states);
    for (const [key, m] of Object.entries(spec.moves as Record<string, MoveSpec<string>>)) {
      moves[key] = Object.freeze({
        kind: "move", machine, key, from: m.from, to: typeof m.to === "string" ? [m.to] : m.to, emits: m.emits,
        ...(m.by === undefined ? {} : { by: m.by }), ...(m.late === undefined ? {} : { late: m.late }), ...(m.lazy === undefined ? {} : { lazy: m.lazy }),
      });
    }
    (machine as { notFrom: unknown }).notFrom = Object.freeze({ kind: "not-from", machine, exit: spec.notFrom.exit });
    return Object.freeze(machine) as never;
  },
};
