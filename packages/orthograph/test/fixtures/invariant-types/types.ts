// Planted fixture (G5 section 1, ST1.14's type halves). Compiled on its own by test/invariants.test.ts, never by the package's
// typecheck. The first lines compile; each `@ts-expect-error` line hides exactly one error, so a line that stops failing fails the test.
// The spelling is G5's: `machine.states.<state>` references, `Blueprint.invariant.unique(field or tuple, { while, refuse, description })`.
import { Blueprint } from "../../../src/index.ts";

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }) },
});
const Allowance = Blueprint.thing({
  description: "Something spendable.",
  code: "AL",
  fields: { id: Blueprint.id("alw"), limit: Blueprint.text({ max: 40 }) },
});
const claimed = Blueprint.event({});
const released = Blueprint.event({});
const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: { claim: { from: [], to: "claimed", emits: claimed }, release: { from: ["claimed"], to: "released", emits: released } },
  notFrom: { exit: 60 },
});
const allowanceMachine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted"],
  moves: { open: { from: [], to: "active", emits: claimed } },
  notFrom: { exit: 61 },
});

class HandleTaken extends Blueprint.error({}, { exit: 10 }) {}
class HandleNamed extends Blueprint.error({ name: Handle.fields.name }, { exit: 11 }) {}
class OwnerNamed extends Blueprint.error({ owner: Handle.fields.owner, name: Handle.fields.name }, { exit: 12 }) {}
class HandleHeld extends Blueprint.error({ owner: Handle.fields.owner }, { exit: 13 }) {}

// Accepted: a state of this thing's machine as a reference, the refusal's fields all in the key, a tuple, no options at all, a description.
export const accepted = [
  Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed], refuse: HandleTaken }),
  Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed], refuse: HandleNamed }),
  Blueprint.invariant.unique([Handle.fields.owner, Handle.fields.name], { refuse: OwnerNamed, description: "you already hold this name" }),
  Blueprint.invariant.unique(Handle.fields.owner),
];

// @ts-expect-error a state of another thing's machine
export const otherMachine = Blueprint.invariant.unique(Handle.fields.name, { while: [allowanceMachine.states.active] });
// @ts-expect-error a state the machine does not have
export const ghost = Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.ghost] });
// @ts-expect-error a state is a reference, not a string written outside the machine's own declaration
export const asString = Blueprint.invariant.unique(Handle.fields.name, { while: ["claimed"] });
// @ts-expect-error a refusal carrying a field that is not in the key (`owner`, with the key `name`)
export const leaky = Blueprint.invariant.unique(Handle.fields.name, { refuse: HandleHeld });
// @ts-expect-error a field of another thing
export const foreign = Blueprint.invariant.unique(Allowance.fields.limit, { while: [machine.states.claimed] });
// @ts-expect-error a tuple mixing the fields of two things
export const mixed = Blueprint.invariant.unique([Handle.fields.name, Allowance.fields.limit]);
// @ts-expect-error a field's name as a string is not a field
export const byString = Blueprint.invariant.unique("name");
// @ts-expect-error an empty tuple has no key
export const empty = Blueprint.invariant.unique([]);
// @ts-expect-error the description is words, not a number
export const described = Blueprint.invariant.unique(Handle.fields.name, { description: 3 });
