import { NotAllowed, type Allowed, type AnyCall, type Assertion, type FieldsInput, type Thing } from "orthograph";
import { Blanks, ErrorNames, EventNames, Scripting } from "orthograph/server";
import type { AllowedModel, JourneyModel, OperationModel, StartingWorldModel } from "../types.ts";
import type { Layout } from "./layout.ts";

const data = (value: unknown): unknown => {
  if (Scripting.isRef(value)) return { ref: Scripting.pathOf(value) };
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(data);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, data(v)]));
  return value;
};

/** A payload with each secret field redacted: `secret` says by key (a ref is only a path, so it stays). */
const publicData = (values: Readonly<Record<string, unknown>>, secret: (key: string) => boolean) =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key, secret(key) && !Scripting.isRef(value) ? { redacted: true } : data(value),
  ]));

/** The blanks a value is or holds one level down: a stub's world, payload, expected fields or id (K16 e). */
const blanksIn = (value: unknown): ReadonlyArray<string> => {
  if (Blanks.isBlank(value)) return [value.what];
  if (!value || typeof value !== "object" || Scripting.isRef(value)) return [];
  return Object.values(value).flatMap((v) => (Blanks.isBlank(v) ? [v.what] : []));
};

/** A step's blanks: in its call's payload and in each check (the check itself, its fields, its id or its value). */
const stepBlanks = (step: { readonly call: AnyCall; readonly checks: ReadonlyArray<Assertion> }) => [
  ...blanksIn(step.call.payload),
  ...step.checks.flatMap((c) => (Blanks.isBlank(c) ? [(c as { readonly what: string }).what]
    : c.kind === "emits" || c.kind === "refuses" ? blanksIn(c.fields) : c.kind === "is-in" ? blanksIn(c.id) : c.kind === "expect-equal" ? blanksIn(c.value) : [])),
];

export const storiesOf = (
  layout: Layout,
  operations: Readonly<Record<string, OperationModel>>,
  allowed: (rule: Allowed, file: string) => AllowedModel,
) => {
  const names = new Map([...layout.things.values()].flatMap((t) => [...t.verbs].map(([verb, v]) => [v.declaration, `${t.name}.${verb}`] as const)));
  const things = new Map([...layout.things.values()].map((t) => [t.thing, t.name]));
  const refused = new Map([...layout.things.values()].map((t) => [t.machine?.notFrom, t.name]));
  const castOf = (cast: Readonly<Record<string, Allowed>>, file: string) =>
    Object.fromEntries(Object.entries(cast).map(([name, role]) => [name, allowed(role, file)]));

  const callOf = (call: AnyCall) => {
    // The tools list runs no operation: it is told as a step that is not in the model's operations.
    if (call.operation === undefined) return undefined;
    const operation = names.get(call.operation);
    if (operation === undefined) return undefined;
    // A blank operation has no model to read visibility from, but its payload fields are declared: redact by declaration.
    const declared = (call.operation as { readonly payload?: unknown }).payload;
    const secret = (key: string) => operations[operation] !== undefined
      ? operations[operation].payload[key]?.visibility !== undefined
      : Blanks.isBlank(declared) || (declared as FieldsInput | undefined)?.[key]?.visibility !== "public";
    return {
      actor: call.actor, operation, payload: publicData(call.payload, secret),
      ...(call.request === undefined ? {} : { request: call.request }),
      ...(call.via === undefined ? {} : { via: call.via }),
    };
  };

  const checkOf = (check: Assertion): { readonly kind: Assertion["kind"]; readonly [key: string]: unknown } => {
    switch (check.kind) {
      case "expect": return { kind: check.kind, match: check.match.source, flags: check.match.flags };
      case "expect-equal": return { kind: check.kind, value: data(check.value) };
      case "emits": return {
        kind: check.kind, event: EventNames.nameOf(check.event),
        fields: Object.fromEntries(Object.entries(check.fields).map(([k, v]) => [k, check.event.fields[k]?.visibility === "public" ? data(v) : { redacted: true }])),
      };
      case "refuses": {
        const error = check.error;
        const thing = "kind" in error && error.kind === "not-from" ? refused.get(error) : undefined;
        const missing = "kind" in error && error.kind === "not-found" ? things.get(error.thing) : undefined;
        const fields = "fields" in error ? error.fields : undefined;
        return {
          kind: check.kind,
          error: thing !== undefined ? `${thing}.notFrom` : missing !== undefined ? `${missing}.notFound`
            : error === NotAllowed ? NotAllowed.name : ErrorNames.nameOf(error as Parameters<typeof ErrorNames.nameOf>[0]),
          fields: Object.fromEntries(Object.entries(check.fields).map(([k, v]) => [k, fields?.[k]?.visibility && fields[k]?.visibility !== "public" ? { redacted: true } : data(v)])),
        };
      }
      case "is-in": return { kind: check.kind, thing: things.get(check.thing as Thing), id: data(check.id), state: check.state };
      case "lacks":
      case "has": return { kind: check.kind, operations: check.operations.map((op) => names.get(op) ?? "an undeclared operation") };
      default: return check;
    }
  };

  const journeys: Record<string, JourneyModel> = {};
  // A journey with blanks (a stub from `ortho add journeys`) is listed here, and prove skips it, naming it (K16 e).
  const blanks: Record<string, Array<string>> = {};
  for (const [file, { declaration: j, sourceHash }] of [...layout.journeys].sort(([a], [b]) => a.localeCompare(b))) {
    const cast = castOf(j.cast, file);
    const declared = j.steps(Scripting.script(j.cast));
    const found = [...blanksIn(j.starts), ...declared.flatMap(stepBlanks)];
    if (found.length > 0) blanks[file] = found;
    const steps = declared.map((step) => {
      const call = callOf(step.call);
      return call === undefined
        ? { title: step.title, skipped: step.call.operation === undefined ? "the tools list is not an operation" : "operation is outside the model" }
        : { title: step.title, call, checks: step.checks.filter((c) => !Blanks.isBlank(c)).map(checkOf) };
    });
    const starts = Blanks.isBlank(j.starts) ? null : j.starts ?? null;
    journeys[file] = { name: j.name, file, cast, starts, steps, ...(found.length > 0 ? { blanks: found } : {}), ...(sourceHash ? { sourceHash } : {}) };
  }

  const startingWorlds: Record<string, StartingWorldModel> = {};
  for (const [name, { file, declaration: w, sourceHash }] of layout.startingWorlds) {
    const cast = castOf(w.cast, file);
    const members = { ...w.cast };
    const seen = new Set([name]);
    for (let parent = w.from; parent !== undefined && !seen.has(parent);) {
      seen.add(parent);
      const ancestor = layout.startingWorlds.get(parent)?.declaration;
      for (const [actor, role] of Object.entries(ancestor?.cast ?? {})) members[actor] ??= role;
      parent = ancestor?.from;
    }
    const script = Scripting.script(members);
    startingWorlds[name] = {
      name, file, from: w.from ?? null, cast, ...(sourceHash ? { sourceHash } : {}),
      makes: w.makes(script).map((call) => callOf(call) ?? null), gives: data(w.gives(script)),
    };
  }
  return { journeys, startingWorlds, journeyBlanks: blanks };
};
