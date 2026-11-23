import { Schema } from "effect";
import { structOf, valueOf } from "#modules/things/service.js";
import type { Allowed } from "#modules/roles/types.js";
import { Values } from "#modules/values/service.js";
import { Visibilities } from "#modules/visibility/service.js";
import type { FieldsInput, Thing } from "#modules/things/types.js";
import type { Budget, CallStep, Operation, OperationsApi, Order, Step } from "./types.ts";
import { Blanks } from "#modules/blanks/service.js";

/** Fields not written yet (`Blueprint.todo`) have no schema yet: until they're filled, nothing decodes to them. */
const filled = (fields: FieldsInput): FieldsInput => (Blanks.isBlank(fields) ? {} : fields);

/** The caller may supply any text as a filter. A returned state is a machine label. */
const StateFilter = Values.text({ max: 64 });
const State = Visibilities.traced(StateFilter);

/** Each list item has the thing's fields and the same state field as a read by id. */
export const listItemFields = (thing: Thing): FieldsInput => ({ ...thing.fields, state: State });

type ByIdSpec = { readonly by: "id"; readonly fields: ReadonlyArray<string>; readonly allowed: ReadonlyArray<Allowed>; readonly budget?: Budget };
type ListSpec = { readonly where: ReadonlyArray<string>; readonly order: Order; readonly page: number; readonly allowed: ReadonlyArray<Allowed>; readonly budget?: Budget };
type ReadSpec = ByIdSpec | ListSpec;

/** A read by id: its payload is the thing's id, its answer the fields it names, `state` as text. */
const idRead = (thing: Thing, spec: ByIdSpec) => {
  const payload: FieldsInput = { id: thing.fields["id"]! };
  const answer: FieldsInput = Blanks.isBlank(spec.fields) ? {} : Object.fromEntries(
    spec.fields.map((f) => [f, f === "state" ? State : thing.fields[f]!] as const),
  );
  return Object.freeze({
    kind: "read", thing, by: "id", fields: spec.fields, where: [], order: undefined, page: undefined,
    allowed: spec.allowed, budget: spec.budget, payload, optional: [], answer,
    payloadSchema: structOf(payload), answerSchema: structOf(answer),
  }) as never;
};

/** The cursor of a list: opaque text the server hands back in `next`. */
const Cursor = Values.text({ max: 64 });

/**
 * A list: its payload is the `where` fields (the thing's own fields, so a role can follow them) and a cursor, every one
 * optional; its answer is a page, `{ items, next }`, the items being whole instances with `state` as text.
 */
const listRead = (thing: Thing, spec: ListSpec) => {
  const where = Blanks.isBlank(spec.where) ? [] : spec.where;
  const payload: FieldsInput = {
    ...Object.fromEntries(where.map((f) => [f, f === "state" ? StateFilter : thing.fields[f]!] as const)),
    cursor: Cursor,
  };
  const optional = Object.keys(payload);
  const fields = [...Object.keys(thing.fields), "state"];
  const item = structOf(listItemFields(thing));
  const answer: FieldsInput = { items: Values.value(Schema.Array(item)), next: Values.value(Schema.NullOr(Schema.String)) };
  const payloadSchema = Schema.Struct(Object.fromEntries(Object.entries(payload).map(([k, f]) => [k, Schema.optionalKey(valueOf(f).schema)])));
  return Object.freeze({
    kind: "read", thing, by: "list", fields, where, order: spec.order, page: spec.page,
    allowed: spec.allowed, budget: spec.budget, payload, optional, answer, payloadSchema, answerSchema: structOf(answer),
  }) as never;
};

export const Operations: OperationsApi = {
  operation: (thing, spec) =>
    Object.freeze({
      kind: "operation",
      thing,
      description: spec.description,
      payload: spec.payload,
      answer: spec.answer,
      payloadSchema: structOf(filled(spec.payload)),
      answerSchema: structOf(filled(spec.answer)),
      move: spec.move,
      errors: spec.errors ?? [],
      allowed: spec.allowed,
      steps: spec.steps ?? {},
      idempotent: spec.idempotent,
      budget: spec.budget,
      runs: spec.runs ?? "server",
      runsDeclared: spec.runs,
      test: spec.test ?? "unit",
      // A stray `signedBy` (D5's retired key, absent from the type on purpose) rides along so the compiler can refuse it by name (M6-chain item 1).
      ...("signedBy" in spec ? { signedBy: spec.signedBy } : {}),
    }) as unknown as Operation<typeof thing, typeof spec.payload, typeof spec.answer, never, never> as never,
  read: ((thing: Thing, spec: ReadSpec) => ("where" in spec ? listRead(thing, spec) : idRead(thing, spec))) as OperationsApi["read"],
  step: {
    database: (spec) => Object.freeze({
      kind: "step", type: "database",
      ...(spec?.writes ? { writes: Object.freeze([...spec.writes]) } : {}),
      ...(spec?.optional ? { optional: true } : {}),
    }) as Step<"database">,
    wait: (spec) => Object.freeze({ kind: "step", type: "wait", ...(spec?.optional ? { optional: true } : {}) }) as Step<"wait">,
    call: (call) => Object.freeze({ kind: "step", type: "call", call }) as CallStep,
  },
};
