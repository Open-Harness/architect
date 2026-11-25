// Scaffolded from ortho new adapter. Yours from now on.
// What PostHog's description doesn't say. PostHog publishes no body for an alert: a destination's template makes it, so the
// body is ours, written once here and once in the template a person pastes into the destination (GOAL17-connections D).
// Two events, both about one error tracking issue: `errorAlert` (the issue is active: created, or reopened) and `errorResolved`.
// What a template adds is kept at every level. An alert names no account, and its identity is its issue, its kind and its time.
import { Blueprint, Stand, type AdapterDoor } from "orthograph";
import { schemaOf } from "./runtime/json-schema.ts";
import type { JsonSchema } from "./runtime/types.ts";

const text = { type: "string" } as const;

/** The body: the project, the issue and when it was alerted; `status` says which event it is. */
const body = (status: "active" | "resolved"): JsonSchema => ({
  type: "object",
  required: ["project", "issue", "timestamp"],
  properties: {
    project: { type: "object", required: ["id"], properties: { id: text } },
    issue: {
      type: "object",
      required: ["id", "name", "url", "status"],
      properties: { id: text, name: text, url: text, status: { const: status }, description: { type: ["string", "null"] } },
    },
    timestamp: text,
  },
});

type Alert = { readonly project: { readonly id: string }; readonly issue: { readonly id: string }; readonly timestamp: string };

/** An issue, the kind of event and its time: a reopened issue is a new event, a resolve is another. */
const identity = (kind: string) => ({
  id: (raw: unknown) => { const e = raw as Alert; return `${e.issue.id}:${kind}:${e.timestamp}`; },
  actor: () => undefined,
  /** The issue the alert is about: a repeat is compared on it (GOAL17-repeat-mismatch). */
  object: (raw: unknown) => (raw as Alert).issue,
});

export const events = {
  errorAlert: Blueprint.incoming(schemaOf({}, body("active")), identity("errorAlert")),
  errorResolved: Blueprint.incoming(schemaOf({}, body("resolved")), identity("errorResolved")),
};

export const standIn = Stand.process("a small server over project 1 and three error tracking issues that answers PostHog's REST API as PostHog does");

/** PostHog documents no signature for a webhook destination, so it has no door until a record says how one verifies (GOAL17-connections, open risks). */
export const door: AdapterDoor | undefined = undefined;

/** Its errors' refusal code prefix: `PO`, the default, is intake's policy's. */
export const code: string | undefined = "PH";
