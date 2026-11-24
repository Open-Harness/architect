// Check 06 (Goal 17 slice 3): each event the superagent listens to decodes what its service sends and nothing else.
// GitHub's come from the spec's webhooks (one event, `issue_comment`, is any of its actions' payloads); Slack's are
// written by hand, since Slack's spec has no events, and are judged against payloads Slack documents (slack-events.ts).
// An adapter's `events.<name>.schema` is an Effect schema of the payload the door receives. A decoded payload is the same
// JSON as the one sent: nothing the spec documents is dropped, nothing is turned into a Date.
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { NEEDS, appPlugin } from "./needs.ts";
import { trimmed } from "./pins.ts";
import { build, descriptor, type Node } from "./plugin.ts";
import { plants, sample } from "./schema.ts";
import { APP_MENTION, MESSAGE_PLANTS, SLACK_ENVELOPES, THREAD_REPLY, USER_MESSAGE, BOT_MESSAGE, appMentionPlants } from "./slack-events.ts";
import { readSpec, webhooks, type Json } from "./spec.ts";

const decodes = (event: Node, payload: unknown) => { try { Schema.decodeUnknownSync(event["schema"])(payload); return true; } catch { return false; } };
const roundtrip = (event: Node, payload: unknown) => JSON.parse(JSON.stringify(Schema.decodeUnknownSync(event["schema"])(payload))) as unknown;

describe("06 github: the events it listens to", () => {
  const spec = readSpec(trimmed("github"));
  const dir = appPlugin("github");
  const events = webhooks(spec).filter((e) => NEEDS.github.events.includes(e.name));

  it("every action of every event decodes its own example whole, and refuses each wrong one", async () => {
    build(dir);
    const adapter = await descriptor(dir);
    expect(events.map((e) => e.name).sort()).toEqual([...NEEDS.github.events].sort());
    for (const event of events) {
      const mine = adapter["events"]?.[event.name] as Node;
      expect(mine, `${event.name} is an event of the adapter`).toBeDefined();
      for (const action of event.actions) {
        for (const full of [false, true]) {
          const payload = sample(spec, action.schema, { full });
          expect(decodes(mine, payload), `${action.entry} (full=${String(full)})`).toBe(true);
          expect(roundtrip(mine, payload), `${action.entry} comes back whole`).toEqual(payload);
        }
        const base = sample(spec, action.schema, { full: true });
        for (const plant of plants(spec, action.schema, base)) expect(decodes(mine, plant.value), `${action.entry}: ${plant.label}`).toBe(false);
      }
    }
  });

  it("an action the spec doesn't list for the event is refused, and so is another event's payload", async () => {
    const adapter = await descriptor(dir);
    for (const event of events) {
      const mine = adapter["events"][event.name] as Node;
      const base = sample(spec, event.actions[0]!.schema, { full: true }) as Record<string, Json>;
      expect(decodes(mine, { ...base, action: "never-sent" }), `${event.name}: an action no entry lists`).toBe(false);
      for (const other of events.filter((o) => o.name !== event.name)) {
        expect(decodes(mine, sample(spec, other.actions[0]!.schema, { full: false })), `${other.name}'s payload is not ${event.name}'s`).toBe(false);
      }
    }
  });
});

describe("06 slack: the events it listens to, written by hand", () => {
  const dir = appPlugin("slack");

  it("an app mention, a message, a reply in a thread and a bot's message decode whole", async () => {
    build(dir);
    const adapter = await descriptor(dir);
    expect(Object.keys(adapter["events"] ?? {}).sort()).toEqual([...NEEDS.slack.events].sort());
    const mention = adapter["events"]["appMention"] as Node;
    const message = adapter["events"]["message"] as Node;
    expect(roundtrip(mention, APP_MENTION)).toEqual(APP_MENTION);
    for (const payload of [USER_MESSAGE, THREAD_REPLY, BOT_MESSAGE]) expect(roundtrip(message, payload), JSON.stringify(payload)).toEqual(payload);
  });

  it("each wrong payload is refused: a part left out, a part of another type, a different event, an unknown kind", async () => {
    const adapter = await descriptor(dir);
    const mention = adapter["events"]["appMention"] as Node;
    const message = adapter["events"]["message"] as Node;
    for (const [label, payload] of appMentionPlants()) expect(decodes(mention, payload), `appMention: ${label}`).toBe(false);
    for (const [label, payload] of MESSAGE_PLANTS) expect(decodes(message, payload), `message: ${label}`).toBe(false);
    expect(decodes(mention, USER_MESSAGE), "a message is not an app mention").toBe(false);
    expect(decodes(message, APP_MENTION), "an app mention is not a message").toBe(false);
    for (const envelope of SLACK_ENVELOPES) {
      expect(decodes(mention, envelope.payload) || decodes(message, envelope.payload), `${envelope.label} is neither`).toBe(false);
    }
  });
});
