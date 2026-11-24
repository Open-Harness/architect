import { Blueprint } from "orthograph";
import type { Connection, Declared } from "orthograph";
import { Superagent as SuperagentThing } from "./blueprint/things/superagent/thing.ts";
import * as superagentEvents from "./blueprint/things/superagent/events.ts";

export default Blueprint.feature({
  description: "The Superagent and its Proposals: one always-on agent, stored as data, and what its main agent may only propose.",
});

/** What a blueprint says to make a superagent at the first deploy: the same create a person would call. */
export interface Declaration {
  readonly name: string;
  readonly purpose: string;
  readonly connections: ReadonlyArray<Connection>;
  readonly policy: { readonly mode: "off" | "observe" | "auto"; readonly allowed?: ReadonlyArray<string>; readonly admission?: Readonly<Record<string, string>>; readonly rules?: ReadonlyArray<{ readonly id: string; readonly instruction: string }> };
  readonly playbook: { readonly sandbox: string; readonly prepare?: string; readonly skills?: ReadonlyArray<string>; readonly endsWhen: "reported" | "threadsClosed" | "never" };
}
export const Superagent = { declare: (declaration: Declaration): Declared<typeof SuperagentThing, Declaration> => Blueprint.declare(SuperagentThing, declaration) };

/** What an app wires: this plugin's events. */
export const events = { ...superagentEvents };
