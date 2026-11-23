// Scaffolded from ortho new adapter. Yours from now on.
// What Slack's description doesn't say. Its Web API description has no events, so the two the superagent listens to are
// written here from Slack's Events API (api.slack.com/events/app_mention, /events/message, /apis/events-api): the whole
// envelope the HTTP door receives, since only the envelope has the team, the event's id and its time.
import { Blueprint, Stand, type AdapterDoor } from "orthograph";
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

type Envelope = { readonly event: { readonly channel: string; readonly ts: string; readonly user?: string; readonly bot_id?: string } };

/** One message is one event (GOAL17-connections B): its channel and `ts`, whatever the envelope's id or time, a retry, or the event's kind. */
const identity = {
  id: (raw: unknown) => { const e = (raw as Envelope).event; return `${e.channel}:${e.ts}`; },
  /** A bot's message has its `bot_id` as its account; a person's has the user's id (Slack's events carry no names). */
  actor: (raw: unknown) => {
    const { user, bot_id } = (raw as Envelope).event;
    if (bot_id !== undefined) return { id: bot_id, name: bot_id, bot: true };
    return user === undefined ? undefined : { id: user, name: user, bot: false };
  },
};

export const events = {
  appMention: Blueprint.incoming(schemaOf({}, envelope(appMention)), identity),
  message: Blueprint.incoming(schemaOf({}, envelope(message)), identity),
};

export const standIn = Stand.process("a small server over channel C024BE91L that answers Slack's Web API as Slack does");

/** Slack's signing secret: in an environment it is `<MOUNT>_WEBHOOK_SIGNING`, `SLACK_WEBHOOK_SIGNING` for the mount `slack`. */
export const webhookSigning = Blueprint.secret.stored();

/**
 * Slack signs `v0:<X-Slack-Request-Timestamp>:<raw body>` with HMAC-SHA256 (`X-Slack-Signature: v0=<hex>`) and a request more than five
 * minutes from the clock is refused (docs.slack.dev, "Verifying requests from Slack"). The event's name is in the envelope, and a
 * `url_verification` request is answered with its challenge once signed.
 */
export const door: AdapterDoor = {
  signing: webhookSigning,
  verify: { header: "x-slack-signature", prefix: "v0=", signs: { version: "v0" }, timestamp: { header: "x-slack-request-timestamp", within: 300 } },
  event: { path: ["event", "type"] },
  challenge: { field: "type", is: "url_verification", answer: "challenge" },
};
