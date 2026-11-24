// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/agents/blueprint/things/agent/thing.js";
import type * as Events from "@orthograph/agents/blueprint/things/agent/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an agent moves between, as its machine declares them. */
export type AgentState = "idle" | "working" | "stopped";

/** One agent: a durable conversation that lives in its own actor, told through the outbox and acting as itself. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Agent = {
  readonly "id": Of<Declared["id"]>;
  readonly "kind": Of<Declared["kind"]>;
  readonly "about": Of<Declared["about"]>;
  readonly "current"?: Of<Declared["current"]>;
  readonly "state": AgentState;
};

/** The event AgentClosed: what it carries when an agent moves. */
export type AgentClosed = {
  readonly "agent": Of<(typeof Events)["AgentClosed"]["fields"]["agent"]>;
  readonly "assignment": Of<(typeof Events)["AgentClosed"]["fields"]["assignment"]>;
};

/** The event AgentIdled: what it carries when an agent moves. */
export type AgentIdled = {
  readonly "agent": Of<(typeof Events)["AgentIdled"]["fields"]["agent"]>;
  readonly "about": Of<(typeof Events)["AgentIdled"]["fields"]["about"]>;
  readonly "assignment"?: Of<(typeof Events)["AgentIdled"]["fields"]["assignment"]>;
};

/** The event AgentOpened: what it carries when an agent moves. */
export type AgentOpened = {
  readonly "agent": Of<(typeof Events)["AgentOpened"]["fields"]["agent"]>;
  readonly "kind": Of<(typeof Events)["AgentOpened"]["fields"]["kind"]>;
  readonly "about": Of<(typeof Events)["AgentOpened"]["fields"]["about"]>;
};

/** The event AgentTold: what it carries when an agent moves. */
export type AgentTold = {
  readonly "agent": Of<(typeof Events)["AgentTold"]["fields"]["agent"]>;
  readonly "requestId": Of<(typeof Events)["AgentTold"]["fields"]["requestId"]>;
};
