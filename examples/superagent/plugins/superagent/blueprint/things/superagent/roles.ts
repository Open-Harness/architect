import { Blueprint } from "orthograph";
import { Superagent } from "./thing.ts";
import { machine as proposalMachine } from "../proposal/machine.ts";

/** The superagent's main agent, acting as itself (K40 fix 3): the role over its `main` field. */
export const itsMain = Blueprint.role(Superagent, { agent: Superagent.fields.main });

/**
 * What a configuration change declares so that a main agent calling it only records a Proposal (K39, snag #705): the superagent whose `main` is the calling
 * agent, the Proposal's `propose` move, and what the agent is answered, which is as if nothing changed. A person's call applies as always.
 */
export const proposed = (answer: { readonly [field: string]: unknown }) =>
  ({ move: proposalMachine.moves.propose, of: { thing: Superagent, field: Superagent.fields.main }, into: "superagent", answer }) as const;

/** The longest reason a main agent gives for a change: it is shown to the person who approves it. */
export const WHY_MAX = 2000;
