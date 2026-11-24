// What a verified delivery says: its body as JSON, its event's name (the sender writes `issue_comment`, the adapter says `issueComment`),
// and whether it is the handshake a sender sends to see the door answer.
import { Option, Schema } from "effect";
import type { AdapterDoor } from "orthograph";

const parseJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

const asRecord = (x: unknown): Readonly<Record<string, unknown>> | undefined => (typeof x === "object" && x !== null && !Array.isArray(x) ? (x as Readonly<Record<string, unknown>>) : undefined);

/** The body as JSON, or nothing when it is not JSON. */
export const jsonOf = (raw: string): Option.Option<unknown> => parseJson(raw);

/** `issue_comment` is `issueComment`; a name with no underscore is its own. */
export const camel = (written: string): string => written.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());

/** Where the door's rule says the event's name is: a header, or a path into the body. Undefined where it is not there. */
export const eventNameOf = (rule: AdapterDoor["event"], headers: Headers, body: unknown): string | undefined => {
  if ("header" in rule) {
    const given = headers.get(rule.header);
    return given === null || given === "" ? undefined : camel(given);
  }
  const found = rule.path.reduce<unknown>((at, key) => asRecord(at)?.[key], body);
  return typeof found === "string" && found !== "" ? camel(found) : undefined;
};

/** The answer to a handshake: the body's own `answer`, when its `field` is `is`. */
export const challengeOf = (rule: AdapterDoor["challenge"], body: unknown): string | undefined => {
  const given = asRecord(body);
  if (rule === undefined || given === undefined || given[rule.field] !== rule.is) return undefined;
  const answer = given[rule.answer];
  return typeof answer === "string" ? answer : undefined;
};
