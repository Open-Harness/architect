// Slack's event payloads, as Slack documents them (api.slack.com/events/app_mention, /events/message, /apis/events-api):
// Slack's Web API spec has none, so the adapter's schemas are written by hand and these are what they are judged by. An
// event is the whole envelope the HTTP door receives, since only the envelope has the team, the event's id and its time.
// Written here as literals, never derived from the adapter.
import type { Json } from "./spec.ts";

type Obj = { [key: string]: Json };
const envelope = (event: Obj, id: string): Obj => ({
  token: "one-time-verification-token", team_id: "T061EG9R6", api_app_id: "A0PNCHHK2", type: "event_callback",
  event, event_id: id, event_time: 1515449522, authed_users: ["U0LAN0Z89"],
});

export const APP_MENTION: Obj = envelope({
  type: "app_mention", user: "U061F7AUR", text: "<@U0LAN0Z89> is it everything a river should be?",
  ts: "1515449522.000016", channel: "C0LAN2Q65", event_ts: "1515449522000016",
}, "Ev0LAN670R");

export const USER_MESSAGE: Obj = envelope({
  type: "message", channel: "C024BE91L", user: "U024BE7LH", text: "Can someone look at the slug parser?",
  ts: "1355517523.000005", event_ts: "1355517523.000005", channel_type: "channel",
}, "Ev0LAN670S");

/** A reply in a thread: the same event, with the thread's parent named. */
export const THREAD_REPLY: Obj = envelope({
  type: "message", channel: "C024BE91L", user: "U024BE7LH", text: "It fails on dashes.",
  ts: "1355517600.000007", event_ts: "1355517600.000007", thread_ts: "1355517523.000005", channel_type: "channel",
}, "Ev0LAN670T");

/** A bot's message arrives as a message too, with no `user`: the gate needs to see it is a bot's. */
export const BOT_MESSAGE: Obj = envelope({
  type: "message", subtype: "bot_message", bot_id: "B19LU7CSY", channel: "C024BE91L", text: "Build 42 passed.",
  ts: "1355517700.000009", event_ts: "1355517700.000009", channel_type: "channel",
}, "Ev0LAN670U");

/** Other things Slack sends the same door: neither is an app mention or a message. */
export const SLACK_ENVELOPES: ReadonlyArray<{ readonly label: string; readonly payload: Obj }> = [
  { label: "the URL verification challenge", payload: { token: "t", challenge: "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P", type: "url_verification" } },
  { label: "a reaction added", payload: envelope({ type: "reaction_added", user: "U024BE7LH", reaction: "thumbsup", item: { type: "message", channel: "C0G9QF9GZ", ts: "1360782400.498405" }, event_ts: "1360782804.083113" }, "Ev0LAN670V") },
];

const clone = (v: Obj): Obj => JSON.parse(JSON.stringify(v)) as Obj;
const inner = (v: Obj) => v["event"] as Obj;
/** `base` with one change: a part left out, or set to something else. `at` is the envelope or its `event`. */
const without = (base: Obj, where: "envelope" | "event", key: string): Obj => { const c = clone(base); delete (where === "event" ? inner(c) : c)[key]; return c; };
const set = (base: Obj, where: "envelope" | "event", key: string, value: Json): Obj => { const c = clone(base); (where === "event" ? inner(c) : c)[key] = value; return c; };

const plantsOf = (base: Obj, eventRequired: ReadonlyArray<string>): ReadonlyArray<readonly [string, Obj]> => [
  ...(["type", "team_id", "event", "event_id", "event_time"] as const).map((k) => [`the envelope's ${k} left out`, without(base, "envelope", k)] as const),
  ...eventRequired.map((k) => [`the event's ${k} left out`, without(base, "event", k)] as const),
  ["the envelope is not an event callback", set(base, "envelope", "type", "url_verification")],
  ["the team is a number", set(base, "envelope", "team_id", 61)],
  ["the event id is a number", set(base, "envelope", "event_id", 670)],
  ["the event time is a string", set(base, "envelope", "event_time", "1515449522")],
  ["the event is a string", set(base, "envelope", "event", "app_mention")],
  ["the event is null", set(base, "envelope", "event", null)],
  ["the event is a list", set(base, "envelope", "event", [])],
  ["the channel is a number", set(base, "event", "channel", 7)],
  ["the channel is null", set(base, "event", "channel", null)],
  ["the time is a number", set(base, "event", "ts", 1515449522.000016)],
  ["the text is a number", set(base, "event", "text", 5)],
  ["the text is null", set(base, "event", "text", null)],
  ["the user is a number", set(base, "event", "user", 7)],
];

export const appMentionPlants = (): ReadonlyArray<readonly [string, Obj]> => [
  ...plantsOf(APP_MENTION, ["type", "user", "text", "ts", "channel"]),
  ["the event is a message", set(APP_MENTION, "event", "type", "message")],
  ["the event is something else", set(APP_MENTION, "event", "type", "reaction_added")],
  ["the user is null", set(APP_MENTION, "event", "user", null)],
];

export const MESSAGE_PLANTS: ReadonlyArray<readonly [string, Obj]> = [
  ...plantsOf(USER_MESSAGE, ["type", "user", "text", "ts", "channel"]),
  ["the event is an app mention", set(USER_MESSAGE, "event", "type", "app_mention")],
  ["the thread is a number", set(THREAD_REPLY, "event", "thread_ts", 1355517523)],
  ["the thread is null", set(THREAD_REPLY, "event", "thread_ts", null)],
  ["a bot's message with no bot id", without(BOT_MESSAGE, "event", "bot_id")],
  ["a bot's message with no text", without(BOT_MESSAGE, "event", "text")],
  ["a bot's message with no channel", without(BOT_MESSAGE, "event", "channel")],
  ["a bot's id that is a number", set(BOT_MESSAGE, "event", "bot_id", 19)],
  ["a subtype that is a number", set(BOT_MESSAGE, "event", "subtype", 3)],
];
