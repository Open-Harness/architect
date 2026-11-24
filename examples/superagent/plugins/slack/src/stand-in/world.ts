// Scaffolded from ortho new adapter. Yours from now on.
// Slack's world: channel C024BE91L, the bot U0BOT0001, a method called as Slack's Web API is and answered as it answers:
// HTTP 200 whatever happened, with `ok: false` and an `error` when it failed. A request in, a reply out; the clock comes
// from the caller, so a test can drive it directly.
export interface Request {
  readonly method: string;
  readonly path: string;
  readonly query: URLSearchParams;
  readonly authorization: string | undefined;
  readonly contentType: string | undefined;
  readonly body: string | undefined;
}
export interface Reply { readonly status: number; readonly body: unknown }
export interface Context {
  /** Milliseconds since the epoch. */
  readonly now: () => number;
  readonly saved: (state: unknown) => void;
}

interface Message { type: "message"; user: string; text: string; ts: string; thread_ts?: string }

export const CHANNEL = "C024BE91L";
export const BOT = "U0BOT0001";

const failed = (error: string): Reply => ({ status: 200, body: { ok: false, error } });

/** The fields of a call, from its query and its body, whether the body is JSON or a form. */
const fieldsOf = (request: Request): Record<string, unknown> => {
  const fromBody: Record<string, unknown> = request.body === undefined || request.body === "" ? {}
    : request.contentType?.includes("application/json") ? (JSON.parse(request.body) as Record<string, unknown>)
    : Object.fromEntries(new URLSearchParams(request.body));
  return { ...Object.fromEntries(request.query), ...fromBody };
};

export const createWorld = (context: Context) => {
  const messages: Array<Message> = [];
  const last = { micros: 0 };

  /** `<seconds>.<six digits>`, and never the same or lower than the one before. */
  const stamp = (): string => {
    last.micros = Math.max(context.now() * 1000, last.micros + 1);
    return `${Math.floor(last.micros / 1_000_000)}.${String(last.micros % 1_000_000).padStart(6, "0")}`;
  };

  const post = (fields: Record<string, unknown>): Reply => {
    if (fields["channel"] !== CHANNEL) return failed("channel_not_found");
    if (typeof fields["text"] !== "string" || fields["text"] === "") return failed("no_text");
    const thread = fields["thread_ts"];
    if (thread !== undefined && !messages.some((m) => m.ts === thread && m.thread_ts === undefined)) return failed("thread_not_found");
    const message: Message = { type: "message", user: BOT, text: fields["text"], ts: stamp(), ...(typeof thread === "string" ? { thread_ts: thread } : {}) };
    messages.push(message);
    context.saved({ messages });
    return { status: 200, body: { ok: true, channel: CHANNEL, ts: message.ts, message } };
  };

  const replies = (fields: Record<string, unknown>): Reply => {
    if (fields["channel"] !== CHANNEL) return failed("channel_not_found");
    const parent = messages.find((m) => m.ts === fields["ts"] && m.thread_ts === undefined);
    if (parent === undefined) return failed("thread_not_found");
    const thread = [parent, ...messages.filter((m) => m.thread_ts === parent.ts)].map((m) => ({ ...m, thread_ts: parent.ts }));
    return { status: 200, body: { ok: true, messages: thread, has_more: false } };
  };

  /** The one user group the policy syncs from: its members' ids, one each. */
  const GROUP = "S0614TZR7";
  const members = (fields: Record<string, unknown>): Reply =>
    fields["usergroup"] === GROUP ? { status: 200, body: { ok: true, users: ["U060R4BJ4", "W123A4BC5"] } } : failed("no_such_subteam");

  const handle = (request: Request): Reply => {
    const method = /^\/api\/([a-zA-Z.]+)$/.exec(request.path)?.[1];
    if (method === undefined) return { status: 404, body: { ok: false, error: "unknown_method" } };
    if ((request.authorization?.replace(/^Bearer\s+/i, "") ?? "") === "") return failed("not_authed");
    const fields = fieldsOf(request);
    if (method === "chat.postMessage") return post(fields);
    if (method === "conversations.replies") return replies(fields);
    if (method === "usergroups.users.list") return members(fields);
    return failed("unknown_method");
  };

  return { handle };
};
