import { Schema, Source } from "orthograph";
import slack from "@orthograph/slack";
import { AccountRef, observedRow } from "../../src/modules/source/types.ts";

/** Where a reply to a Slack trigger goes: the channel, and the thread's root message. */
interface Address { readonly channel: string; readonly ts: string }
interface Envelope { readonly event: { readonly channel: string; readonly ts: string; readonly thread_ts?: string; readonly text: string; readonly channel_type?: string; readonly subtype?: string; readonly bot_id?: string } }
interface Replies { readonly messages: ReadonlyArray<{ readonly ts: string; readonly user?: string; readonly bot_id?: string; readonly text?: string; readonly metadata?: { readonly event_payload?: { readonly key?: string } } }> }

const root = (e: Envelope["event"]): string => e.thread_ts ?? e.ts;

/** The Slack connection: a mention anywhere, a message in a channel it listens to, or a direct message. */
const Config = Schema.Struct({ me: AccountRef, channels: Schema.Array(Schema.String), directMessages: Schema.Boolean });

export const slackSource = Source.from<typeof slack, typeof Config.Type, Address>(slack, {
  config: Config,
  scope: (c, m) => ({ listened: c.channels.includes(m.channel.channel) || (c.directMessages && m.kind === "direct"), observed: m.kind !== "mention", row: m.channel.channel }),
  on: {
    appMention: (raw) => {
      const e = (raw as Envelope).event;
      return { kind: "mention", thread: `${e.channel}:${root(e)}`, text: e.text, addressed: "mention", channel: { channel: e.channel, ts: root(e) } };
    },
    message: (raw) => {
      const e = (raw as Envelope).event;
      return e.subtype !== undefined || e.bot_id !== undefined ? undefined : {
        kind: e.channel_type === "im" ? "direct" : "message", thread: `${e.channel}:${root(e)}`, text: e.text,
        ...(e.channel_type === "im" ? { addressed: "direct" as const } : {}), channel: { channel: e.channel, ts: root(e) },
      };
    },
  },
  reply: {
    call: slack.calls.chatPostMessage,
    args: (m) => ({ channel: m.address.channel, thread_ts: m.address.ts, text: m.text, metadata: { event_type: "orthograph", event_payload: { key: m.key } } }),
    landed: (message, key) => message.meta?.["key"] === key,
    gone: [],
  },
  history: {
    call: slack.calls.conversationsReplies,
    args: (a, cursor) => ({ channel: a.channel, ts: a.ts, ...(cursor ? { cursor } : {}) }),
    page: (answer) => ({ messages: (answer as Replies).messages.map((m) => ({ id: m.ts, from: m.user ?? m.bot_id ?? "", at: m.ts, text: m.text ?? "", ...(m.metadata?.event_payload?.key ? { meta: { key: m.metadata.event_payload.key } } : {}) })) }),
  },
  policyPart: { schema: Schema.Struct({ bots: Schema.Array(AccountRef), userGroup: Schema.optionalKey(Schema.String) }), rows: (c) => c.channels.map((id) => ({ id, label: id, cells: observedRow })) },
  environment: {
    variables: { SLACK_CHANNEL: "the channel the ticket started in", SLACK_THREAD: "its thread's root timestamp" },
    of: (m) => ({ SLACK_CHANNEL: m.channel.channel, SLACK_THREAD: m.channel.ts }),
  },
});
