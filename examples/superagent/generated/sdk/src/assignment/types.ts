// Generated from the blueprint. Do not edit.
import type * as Source from "@orthograph/tickets/blueprint/things/assignment/thing.js";
import type * as Events from "@orthograph/tickets/blueprint/things/assignment/events.js";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an assignment moves between, as its machine declares them. */
export type AssignmentState = "pending" | "running" | "closing" | "ended";

/** One stretch of a ticket's executor holding a seat: it waits, runs, ends. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Assignment = {
  readonly "id": Of<Declared["id"]>;
  readonly "superagent": Of<Declared["superagent"]>;
  readonly "ticket": Of<Declared["ticket"]>;
  readonly "agent": Of<Declared["agent"]>;
  readonly "input": Of<Declared["input"]>;
  readonly "why": Of<Declared["why"]>;
  readonly "seat": Of<Declared["seat"]>;
  readonly "state": AssignmentState;
};

/** The event AssignmentEnded: what it carries when an assignment moves. */
export type AssignmentEnded = {
  readonly "superagent": Of<(typeof Events)["AssignmentEnded"]["fields"]["superagent"]>;
  readonly "assignment": Of<(typeof Events)["AssignmentEnded"]["fields"]["assignment"]>;
  readonly "ticket": Of<(typeof Events)["AssignmentEnded"]["fields"]["ticket"]>;
  readonly "seat": Of<(typeof Events)["AssignmentEnded"]["fields"]["seat"]>;
};

/** The event AssignmentInterrupted: what it carries when an assignment moves. */
export type AssignmentInterrupted = {
  readonly "superagent": Of<(typeof Events)["AssignmentInterrupted"]["fields"]["superagent"]>;
  readonly "assignment": Of<(typeof Events)["AssignmentInterrupted"]["fields"]["assignment"]>;
  readonly "ticket": Of<(typeof Events)["AssignmentInterrupted"]["fields"]["ticket"]>;
  readonly "agent": Of<(typeof Events)["AssignmentInterrupted"]["fields"]["agent"]>;
  readonly "seat": Of<(typeof Events)["AssignmentInterrupted"]["fields"]["seat"]>;
};

/** The event AssignmentPromoted: what it carries when an assignment moves. */
export type AssignmentPromoted = {
  readonly "superagent": Of<(typeof Events)["AssignmentPromoted"]["fields"]["superagent"]>;
  readonly "assignment": Of<(typeof Events)["AssignmentPromoted"]["fields"]["assignment"]>;
  readonly "ticket": Of<(typeof Events)["AssignmentPromoted"]["fields"]["ticket"]>;
};

/** The event AssignmentQueued: what it carries when an assignment moves. */
export type AssignmentQueued = {
  readonly "superagent": Of<(typeof Events)["AssignmentQueued"]["fields"]["superagent"]>;
  readonly "assignment": Of<(typeof Events)["AssignmentQueued"]["fields"]["assignment"]>;
  readonly "ticket": Of<(typeof Events)["AssignmentQueued"]["fields"]["ticket"]>;
  readonly "input": Of<(typeof Events)["AssignmentQueued"]["fields"]["input"]>;
  readonly "why": Of<(typeof Events)["AssignmentQueued"]["fields"]["why"]>;
};

/** The event AssignmentStarted: what it carries when an assignment moves. */
export type AssignmentStarted = {
  readonly "superagent": Of<(typeof Events)["AssignmentStarted"]["fields"]["superagent"]>;
  readonly "assignment": Of<(typeof Events)["AssignmentStarted"]["fields"]["assignment"]>;
  readonly "ticket": Of<(typeof Events)["AssignmentStarted"]["fields"]["ticket"]>;
  readonly "agent": Of<(typeof Events)["AssignmentStarted"]["fields"]["agent"]>;
  readonly "input": Of<(typeof Events)["AssignmentStarted"]["fields"]["input"]>;
  readonly "text": Of<(typeof Events)["AssignmentStarted"]["fields"]["text"]>;
  readonly "seat": Of<(typeof Events)["AssignmentStarted"]["fields"]["seat"]>;
  readonly "why": Of<(typeof Events)["AssignmentStarted"]["fields"]["why"]>;
};
