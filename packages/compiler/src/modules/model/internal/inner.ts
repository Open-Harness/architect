// Inner operations (#1079, CX-inner-operations): an operation step runs another operation of the app inside the outer's one commit, so every
// refusal the inner can make is the outer's too. Once every operation is modelled, this pass merges each inner operation's `errors`, `refusals`,
// `invariants` and `breaks` into its outer, through any depth, and hashes the outer again. It refuses what one commit can't hold: an inner
// operation in another store or on the caller's device, a cycle anywhere in the step graph, and an outer and an inner that declare one refusal's
// name with two shapes. An inner's IdempotencyConflict stays its own: run inside another operation, it keeps no request key.
import type { AnyErrorClass, Operation } from "orthograph";
import type { OperationModel, ThingModel } from "../types.ts";
import { IDEMPOTENCY_CONFLICT } from "./codes.ts";
import { canonical, hashOf } from "./hash.ts";
import type { Layout } from "./layout.ts";
import { placeOf } from "./stores.ts";

const unique = <T>(xs: ReadonlyArray<T>): Array<T> => [...new Set(xs)];

/** Each operation step of an operation, by its key, and the inner operation's name (`?` when it is no verb of the app). */
const innerSteps = (o: OperationModel): ReadonlyArray<readonly [string, string]> =>
  Object.entries(o.steps).flatMap(([key, s]) => (s.type === "operation" && s.operation !== undefined ? [[key, s.operation] as const] : []));

export const mergeInnerOperations = (input: {
  readonly layout: Layout;
  readonly operations: Record<string, OperationModel>;
  readonly things: Readonly<Record<string, ThingModel>>;
  readonly errorNames: ReadonlyMap<AnyErrorClass, string>;
  readonly problems: Array<string>;
}): void => {
  const { layout, operations, things, errorNames, problems } = input;
  // Each verb's declared error classes, and the thing each class is declared by: what tells two refusals of one name apart.
  const declared = new Map<string, ReadonlyArray<AnyErrorClass>>([...layout.things].flatMap(([n, t]) => [...t.verbs].flatMap(([verb, v]) =>
    v.declaration.kind === "operation" ? [[`${n}.${verb}`, (v.declaration as Operation).errors] as const] : [])));
  const errorThing = new Map([...layout.things].flatMap(([n, t]) => [...t.errors.values()].map((e) => [e, n] as const)));
  const shapeOf = (e: AnyErrorClass) => {
    const model = things[errorThing.get(e) ?? ""]?.errors[errorNames.get(e) ?? ""];
    return model === undefined ? "" : canonical({ fields: model.fields, exit: model.exit });
  };

  const inCycle = new Set<string>();
  const cycles = new Set<string>();
  const state = new Map<string, "visiting" | "done">();
  /** The classes each operation's refusals come from, its own and every inner operation's, with the operation that declares each. */
  const classes = new Map<string, ReadonlyArray<readonly [AnyErrorClass, string]>>();

  const visit = (name: string, path: ReadonlyArray<string>): void => {
    const o = operations[name];
    if (o === undefined || o.kind !== "operation" || state.get(name) === "done") return;
    if (state.get(name) === "visiting") {
      const cycle = [...path.slice(path.indexOf(name)), name];
      for (const member of cycle) inCycle.add(member);
      const key = unique(cycle).sort().join(" ");
      if (!cycles.has(key)) {
        cycles.add(key);
        problems.push(`${o.file}: ${cycle.join(" → ")}: an operation runs itself through its operation steps, so its commit never ends: run the work once, in one of them`);
      }
      return;
    }
    state.set(name, "visiting");
    for (const [, inner] of innerSteps(o)) visit(inner, [...path, name]);
    state.set(name, "done");
    merge(name, o);
  };

  const merge = (name: string, o: OperationModel) => {
    const own = (declared.get(name) ?? []).map((e) => [e, name] as const);
    const steps = innerSteps(o);
    const inners = steps.flatMap(([key, i]) => (operations[i] === undefined ? [] : [[key, operations[i]!] as const]));
    classes.set(name, [...own, ...inners.flatMap(([, i]) => classes.get(i.name) ?? [])]);
    if (inners.length === 0) return;
    for (const [key, inner] of inners) {
      const where = `${o.file}: ${o.name} runs ${inner.name} (step ${key})`;
      const outerThing = things[o.thing];
      const innerThing = things[inner.thing];
      if (outerThing !== undefined && innerThing !== undefined && placeOf(outerThing) !== placeOf(innerThing)) {
        problems.push(`${where}, whose thing ${inner.thing} lives in ${placeOf(innerThing)}, and ${o.thing} in ${placeOf(outerThing)}: one call commits to one store, so run work across stores as a workflow`);
      }
      if (inner.runs === "client") problems.push(`${where}, which runs on the caller's device, where there is no store or journal for its writes`);
      // One name, two shapes: on the wire the two refusals can't be told apart.
      for (const [e, by] of classes.get(inner.name) ?? []) {
        const n = errorNames.get(e);
        const clash = own.find(([mine]) => mine !== e && errorNames.get(mine) === n && shapeOf(mine) !== shapeOf(e));
        if (n !== undefined && clash !== undefined) {
          problems.push(`${where}: ${o.name} and ${by} each declare a refusal named ${n}, with two shapes or exits, so on the wire they can't be told apart: rename one`);
        }
      }
    }
    if (inners.some(([, i]) => inCycle.has(i.name)) || inCycle.has(name)) return;
    const invariants = Object.assign({}, o.invariants, ...inners.map(([, i]) => i.invariants ?? {})) as Record<string, string>;
    const { hash: _hash, ...rest } = {
      ...o,
      errors: unique([...o.errors, ...inners.flatMap(([, i]) => i.errors)]),
      refusals: unique([...o.refusals, ...inners.flatMap(([, i]) => i.refusals.filter((r) => r !== IDEMPOTENCY_CONFLICT))]),
      ...(Object.keys(invariants).length > 0 ? { invariants } : {}),
      breaks: unique([...o.breaks, ...inners.flatMap(([, i]) => i.breaks)]),
    };
    operations[name] = { ...rest, hash: hashOf(rest) };
  };

  for (const name of Object.keys(operations).sort()) visit(name, []);
};
