// The "leaks nothing" half of eval 1: no secret or private value in spans, logs or the journal. Untraced text is
// also kept out of spans and logs, but remains public in the journal. Check both the field name and, when distinctive
// enough, the value: a handler may log it in a sentence without an attribute key.
import type { FieldsModel, OperationModel } from "@orthograph/compiler";
import { Schema } from "effect";
import type { FieldsInput, Operation, Read } from "orthograph";
import { traceable } from "orthograph/server";
import type { Evidence } from "../types.ts";
import { where } from "./evidence.ts";

/** A shorter value would match by chance; a value that short is caught by name only. */
const MIN = 8;
const spanMetadata = new Set(["operation", "attempt", "refusal", "defect"]);

const textOf = (v: unknown): string => (typeof v === "string" ? v : typeof v === "bigint" ? v.toString() : JSON.stringify(v) ?? "");

const decodeItems = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Array(Schema.Unknown)));

const hasState = (item: unknown, state: string): item is Record<string, unknown> =>
  typeof item === "object" && item !== null && "state" in item && item.state === state;

/** An exact state also seen in the response is a returned machine label. Keep every other value searchable. */
const withoutReturnedStates = (attribute: unknown, returned: ReadonlyArray<unknown>, state: string): unknown => {
  const decoded = decodeItems(attribute);
  if (decoded._tag === "None") return attribute;
  return decoded.value.map((item, index) =>
    hasState(item, state) && hasState(returned[index], state) ? { ...item, state: undefined } : item);
};

const hiddenOf = (side: "payload" | "answer", fields: FieldsModel, declared: FieldsInput, values: Readonly<Record<string, unknown>>) =>
  Object.entries(fields).flatMap(([field, model]) => {
    const spec = declared[field];
    const reason = model.visibility !== undefined ? "not public" : spec !== undefined && !traceable(spec) ? "untraced text" : undefined;
    return reason === undefined ? [] : [{ field, label: `${side}.${field}`, reason, value: textOf(values[field]) }];
  });

/** Failures name the field and where it appeared, without including its value. */
export const secretsIn = (op: OperationModel, declared: Operation | Read | undefined, e: Evidence): ReadonlyArray<string> => {
  const body = e.call.status === 200 && typeof e.call.body === "object" && e.call.body !== null ? e.call.body as Record<string, unknown> : {};
  const filter = e.call.payload["state"];
  const items = body["items"];
  const filteredList = declared?.kind === "read" && declared.by === "list" && typeof filter === "string" && Array.isArray(items)
    ? { filter, items } : undefined;
  const hidden = [
    ...hiddenOf("payload", op.payload, declared?.payload ?? {}, e.call.payload),
    ...hiddenOf("answer", op.answer, declared?.answer ?? {}, body),
  ];
  const names = new Map(hidden.flatMap((s) => [[s.label, s.reason] as const, [s.field, s.reason] as const]));
  const values = hidden.filter((s) => s.value.length >= MIN);
  const found: Array<string> = [];
  const at = (label: string, reason: string, where_: string) => found.push(`${where(e)}: ${label} (${reason}) appears in ${where_}`);
  for (const span of e.trace.spans) {
    for (const [key, v] of Object.entries(span.attrs)) {
      // The operation label comes from the declaration, even if the caller happens to send the same text.
      if (key === "operation" && v === op.name) continue;
      const reason = spanMetadata.has(key) ? undefined : names.get(key);
      if (reason !== undefined) at(key, reason, `span ${span.name} as the attribute ${key}`);
      const returned = span === e.opSpan && key === "answer.items" && filteredList !== undefined
        ? withoutReturnedStates(v, filteredList.items, filteredList.filter) : v;
      for (const s of values) {
        const value = s.label === "payload.state" && s.reason === "untraced text" ? returned : v;
        if (textOf(value).includes(s.value)) at(s.label, s.reason, `span ${span.name}, attribute ${key}`);
      }
    }
  }
  for (const log of e.trace.logs) {
    for (const s of values) {
      if (log.body.includes(s.value)) at(s.label, s.reason, "a log line");
      else if (Object.values(log.attrs).some((v) => textOf(v).includes(s.value))) at(s.label, s.reason, "a log attribute");
    }
    for (const key of Object.keys(log.attrs)) {
      const reason = names.get(key);
      if (reason !== undefined) at(key, reason, `a log attribute named ${key}`);
    }
  }
  const journal = JSON.stringify(e.call.journal);
  for (const s of values) if (s.reason === "not public" && journal.includes(s.value)) at(s.label, s.reason, "a journal entry");
  return found;
};
