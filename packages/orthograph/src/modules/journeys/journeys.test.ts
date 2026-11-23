import { describe, expect as want, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Things } from "#modules/things/service.js";
import { Roles } from "#modules/roles/service.js";
import { Operations } from "#modules/operations/service.js";
import { Events } from "#modules/events/service.js";
import { Machines } from "#modules/machines/service.js";
import { Checks, Journeys, Scripting } from "./service.ts";

const Box = Things.thing({ description: "A box.", fields: { id: Values.id("box"), size: Values.uint(8) } });
const Packed = Events.event({ box: Box.fields.id });
const machine = Machines.machine(Box, { states: ["packed"], moves: { pack: { from: [], to: "packed", emits: Packed } }, notFrom: { exit: 40 } });
const pack = Operations.operation(Box, {
  description: "Pack a box.", payload: { size: Box.fields.size }, answer: { box: Box.fields.id }, move: machine.moves.pack,
  allowed: [Roles.signedIn],
});

describe("journeys", () => {
  const journey = Journeys.journey("pack a box", {
    cast: { ada: Roles.signedIn },
    starts: "empty",
    steps: (s) => [
      s.step("ada packs", s.ada.run(pack, { size: 3n }), Checks.emits(Packed, { box: s.last.box }), machine.isIn(s.last.box, "packed")),
    ],
  });

  it("describes steps without running anything", () => {
    const steps = journey.steps(Scripting.script(journey.cast) as never);
    want(steps).toHaveLength(1);
    want((steps[0]!.call as { readonly actor: string }).actor).toBe("ada");
    want(steps[0]!.checks.map((c) => c.kind)).toEqual(["emits", "is-in"]);
  });

  it("refuses a cast member named for one of the script's own words, rather than hide it", () => {
    for (const word of ["clock", "world", "last", "step"]) {
      want(() => Scripting.script({ [word]: Roles.signedIn }), word).toThrow(new RegExp(`cast member \`${word}\``));
    }
    want(() => Scripting.script({ ada: Roles.signedIn })).not.toThrow();
  });

  it("reads refs once the world has said them, and names the ones it hasn't", () => {
    const s = Scripting.script({ ada: Roles.signedIn }) as any;
    const payload = { who: s.ada.person, box: s.last.box, n: 1n };
    want(Scripting.resolve(payload, { cast: { ada: { person: "per_1" } }, last: { box: "box_2" } })).toEqual({
      value: { who: "per_1", box: "box_2", n: 1n }, missing: [],
    });
    want(Scripting.resolve(payload, { cast: {} }).missing).toEqual(["cast.ada.person", "last.box"]);
  });

  it("refs are not thenables", () => {
    const s = Scripting.script({}) as any;
    want(s.world.then).toBeUndefined();
  });
});
