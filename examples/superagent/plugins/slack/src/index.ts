// Generated from Slack Web API 1.7.0. Do not edit.
import { Blueprint } from "orthograph";
import { schemaOf } from "./runtime/json-schema.ts";
import { components } from "./spec/components.ts";
import { eventPayloads } from "./spec/events.ts";
import { events as written, standIn } from "./written.ts";

/** The payload of an event: any one of the payloads its service documents for it. */
const payload = (event: string) => Blueprint.incoming(schemaOf(components, { oneOf: eventPayloads[event] ?? [] }));

export default Blueprint.adapter({
  description: "Slack Web API 1.7.0: every call and event its published description lists.",
  calls: {
    "authTest": Blueprint.call(),
    "chatDelete": Blueprint.call(),
    "chatPostMessage": Blueprint.call(),
    "conversationsHistory": Blueprint.call(),
    "conversationsReplies": Blueprint.call(),
  },
  events: {
    ...written,
  },
  standIn,
});
