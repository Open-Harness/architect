import { Option, Schema } from "effect";
import type { Incoming, Json } from "../../script/types.ts";
import type { Request } from "../types.ts";

const parse = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

/** Any JSON, or none: a body that is not JSON is `undefined`. */
export const jsonOf = (text: string): Json => Option.getOrUndefined(parse(text));

const asRecord = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {});

/** The text of a message's content: a string, or the text parts of a list, or the whole thing written out. */
const textOf = (content: unknown): string =>
  typeof content === "string" ? content
  : Array.isArray(content) ? content.map((p) => (typeof asRecord(p)["text"] === "string" ? String(asRecord(p)["text"]) : JSON.stringify(p))).join("\n")
  : content === undefined || content === null ? "" : JSON.stringify(content);

/**
 * What a chat completion carried: the model's name, the tools it was offered, every message's text (a tool call's arguments and a tool's result
 * included, so what an agent read in its last round is searchable), and the agent it is for, from `x-orthograph-about` and `x-orthograph-agent` (or OpenAI's `user`).
 */
export const incomingOf = (request: Request): Incoming => {
  const body = asRecord(jsonOf(request.body));
  const messages = Array.isArray(body["messages"]) ? body["messages"].map(asRecord) : [];
  const tools = Array.isArray(body["tools"]) ? body["tools"].map((t) => String(asRecord(asRecord(t)["function"])["name"] ?? "")).filter((n) => n !== "") : [];
  const about = request.headers["x-orthograph-about"] ?? (typeof body["user"] === "string" ? body["user"] : undefined);
  const agent = request.headers["x-orthograph-agent"];
  return {
    model: typeof body["model"] === "string" ? body["model"] : "",
    tools,
    text: messages.map((m) => [textOf(m["content"]), m["tool_calls"] === undefined ? "" : JSON.stringify(m["tool_calls"])].join("\n")).join("\n"),
    ...(about === undefined ? {} : { about }),
    ...(agent === undefined ? {} : { agent }),
  };
};
