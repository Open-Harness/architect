// Scaffolded from ortho new adapter. Yours from now on.
// What Slack's description doesn't say. Its Web API description has no events, so the two the superagent listens to are
// written here from Slack's Events API (api.slack.com/events/app_mention, /events/message, /apis/events-api): the whole
// envelope the HTTP door receives, since only the envelope has the team, the event's id and its time.
import { Blueprint, Stand } from "orthograph";
import { schemaOf } from "./runtime/json-schema.ts";
import type { JsonSchema } from "./runtime/types.ts";

const text = { type: "string" } as const;

/** The envelope Slack posts: `event_callback`, who and when, and the event itself. */
const envelope = (event: JsonSchema): JsonSchema => ({
  type: "object",
  required: ["type", "team_id", "event", "event_id", "event_time"],
  properties: {
    type: { const: "event_callback" }, token: text, team_id: text, api_app_id: text, event_id: text,
    event_time: { type: "integer" }, authed_users: { type: "array", items: text }, event,
  },
});

const common = { channel: text, ts: text, event_ts: text, thread_ts: text, text, channel_type: text };

const appMention: JsonSchema = {
  type: "object",
  required: ["type", "user", "text", "ts", "channel"],
  properties: { ...common, type: { const: "app_mention" }, user: text },
};

/** A message is a person's (a `user`), or a bot's: a `bot_message` subtype with a `bot_id` and no `user`. */
const message: JsonSchema = {
  oneOf: [
    { type: "object", required: ["type", "user", "text", "ts", "channel"], properties: { ...common, type: { const: "message" }, user: text, subtype: text } },
    { type: "object", required: ["type", "subtype", "bot_id", "text", "ts", "channel"], properties: { ...common, type: { const: "message" }, subtype: { const: "bot_message" }, bot_id: text } },
  ],
};

export const events = {
  appMention: Blueprint.incoming(schemaOf({}, envelope(appMention))),
  message: Blueprint.incoming(schemaOf({}, envelope(message))),
};

export const standIn = Stand.process("a small server over channel C024BE91L that answers Slack's Web API as Slack does");
