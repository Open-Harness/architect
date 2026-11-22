// Turns the layout into the model: every declaration named, every reference resolved, every entry hashed.
import { Duration } from "effect";
import type { AnyErrorClass, Allowed, CallStep, Field, FieldsInput, Operation, Read, Step, Thing, Value, Visibility } from "orthograph";
import type { AllowedModel, BlankOperationModel, FieldModel, FieldsModel, Model, OperationModel, StepModel, ThingModel, VisibilityModel } from "../types.ts";
import { Blanks } from "orthograph/server";
import { IDEMPOTENCY_CONFLICT, MACHINE_NUMBER, codeOf, inDeclarationOrder, prefixes, refusalsOf } from "./codes.ts";
import { foundModel, mintsOf, missedBy, notFoundOf } from "./found.ts";
import { exitClashes, notFoundShapes, operationExitClashes } from "./exits.ts";
import { unfillable } from "./fillable.ts";
import { RUNS_NEEDS, deviceProblems } from "./device.ts";
import { Times } from "#modules/time/service.js";
import { environmentsOf } from "./environments.ts";
import { storiesOf } from "./journeys.ts";
import { hashOf } from "./hash.ts";
import { crossStore, storesOf } from "./stores.ts";
import { breakersOf, declaredErrors, invariantsOf } from "./invariants.ts";
import { camel, pascal, type Layout } from "./layout.ts";

/** A module's exports in name order: a namespace's own order differs between loaders, and the model must not. */
const byName = <V>(m: ReadonlyMap<string, V>) => [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

export const describe = (layout: Layout): { model: Model; problems: Array<string> } => {
  const problems = [...layout.problems];
  const valueNames = new Map<Value, string>([...layout.values].map(([n, v]) => [v, n]));
  const schemaNames = new Map([...layout.values].map(([n, v]) => [v.schema, n]));
  const thingNames = new Map([...layout.things].flatMap(([n, t]) => (t.thing ? [[t.thing, n] as const] : [])));
  const eventNames = new Map([...layout.things.values()].flatMap((t) => [...t.events].map(([n, e]) => [e, n] as const)));
  const errorNames = new Map([...layout.things.values()].flatMap((t) => [...t.errors].map(([n, e]) => [e, n] as const)));
  const roleNames = new Map(
    [...layout.things.values()].flatMap((t) => [...t.roles].map(([n, r]) => [r, `${t.name}.${n}`] as const)),
  );

  const fieldRef = (f: Field): string | undefined => {
    const thing = thingNames.get(f.of);
    return thing ? `${thing}.${f.key}` : undefined;
  };
  /** Public is the default and is left out; a private role is named as `thing.role`. */
  const visibilityModel = (v: Visibility, where: string): VisibilityModel | undefined =>
    v === "public" ? undefined
    : v === "secret" ? "secret"
    : { private: v.to.map((r) => roleNames.get(r) ?? problem(problems, `${where}: is private to a role not exported from a roles.ts`)) };
  /** `Blueprint.issued` is allowed in one place: a secret value in an operation's answer. Anywhere else it is refused, naming the field. */
  const issuedIn = (input: Field | Value, where: string, place: Place): boolean => {
    if (input.issued !== true) return false;
    if (place !== "answer") problems.push(`${where}: is marked Blueprint.issued in ${place}: only a secret value in an operation's answer is issued`);
    else if (input.visibility !== "secret") problems.push(`${where}: is marked Blueprint.issued but is ${input.visibility === "public" ? "public" : "private"}: only a secret value is issued`);
    return place === "answer" && input.visibility === "secret";
  };
  const fieldModel = (input: Field | Value, where: string, place: Place = "a thing's field"): FieldModel => {
    const value = input.kind === "field" ? input.value : input;
    // `Blueprint.issued(Secret)` is a copy of the named value, so it is found by the schema it shares with it.
    const named = valueNames.get(value) ?? (input.issued === true || input.description !== undefined ? schemaNames.get(value.schema) : undefined);
    const ref = input.kind === "field" ? fieldRef(input) : undefined;
    if (input.kind === "field" && !ref) problems.push(`${where}: uses a field of a thing that isn't in the blueprint`);
    const visibility = visibilityModel(input.visibility, where);
    const issued = issuedIn(input, where, place);
    return { value: value.meta, ...(named ? { named } : {}), ...(ref ? { ref } : {}), ...(input.description === undefined ? {} : { description: input.description }), ...(visibility ? { visibility } : {}), ...(issued ? { issued: true as const } : {}) };
  };
  const fieldsModel = (fields: FieldsInput, where: string, place: Place): FieldsModel =>
    Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, fieldModel(f, `${where} field ${k}`, place)]));

  // What isn't written yet, by declaration and part.
  const blanks: Record<string, Array<string>> = {};
  const blankIn = (owner: string, parts: Record<string, unknown>) => {
    const found = Object.entries(parts).flatMap(([k, v]) => (Blanks.isBlank(v) ? [`${k}: ${v.what}`] : []));
    if (found.length > 0) blanks[owner] = [...(blanks[owner] ?? []), ...found];
    return found.length > 0;
  };

  const storeNames = new Map([...layout.stores].map(([n, s]) => [s.store, n] as const));
  /** The declared store a thing lives in, by name: absent for the default store. */
  const storeOf = (store: Thing["store"], where: string) =>
    store ? { store: storeNames.get(store) ?? problem(problems, `${where}/thing.ts: lives in a store that isn't a default export of a stores/<name>.ts`) } : {};
  /** The names of the things a step writes: only when it names any. */
  const writesOf = (writes: ReadonlyArray<Thing> | undefined, where: string) =>
    writes ? { writes: writes.map((w) => thingNames.get(w) ?? problem(problems, `${where}: a step writes a thing that isn't in the blueprint`)) } : {};

  // G4's `unique:` key is retired (S-30): a thing still carrying it is refused, by thing name only (never a field name).
  for (const [n, t] of layout.things) if (t.thing && "unique" in t.thing) problems.push(`thing ${n} declares unique, which is retired: declare it with Blueprint.invariant.unique in blueprint/things/${n}/invariants.ts`);
  const prefix = prefixes(layout.things, problems);
  // A thing some operation's payload names where no role check reads it gets a `<Thing>NotFound` (K16, M1.46).
  const missable = new Set([...layout.things.values()].flatMap((t) => [...t.verbs.values()].flatMap(({ declaration: d }) => missedBy(d, Blanks.isBlank))));
  const things: Record<string, ThingModel> = {};
  const verbs = [...layout.things.values()].flatMap((t) => [...t.verbs.values()].map(({ file, declaration: d }) => ({ file, errors: d.kind === "operation" ? declaredErrors(d.errors) : [] })));
  for (const [name, t] of [...layout.things].sort(([a], [b]) => a.localeCompare(b))) {
    if (!t.thing) continue;
    const where = t.base;
    const fields = Object.fromEntries(
      Object.entries(t.thing.fields).map(([k, f]) => [k, fieldModel(f.issued === true ? f : f.from ?? f.value, `${where}/thing.ts field ${k}`)]),
    );
    const m = t.machine;
    blankIn(name, {
      description: t.thing.description, states: m?.declared,
      ...Object.fromEntries([...t.roles].map(([r, role]) => [`role ${r}`, (role as { rule?: unknown }).rule])),
    });
    const states = m && !Blanks.isBlank(m.declared) ? m.declared : [];
    const machine = m
      ? {
          states,
          moves: Object.fromEntries(Object.entries(m.moves).map(([k, mv]) => {
            // A move made by time carries its `by`, `late` and `lazy`; every problem names the move and its file.
            const timed = Times.move({ name, thing: t.thing!, key: k, move: mv });
            problems.push(...timed.problems.map((p) => `${where}/machine.ts: ${p}`));
            return [k, {
              from: mv.from, to: mv.to, emits: eventNames.get(mv.emits) ?? problem(problems, `${where}/machine.ts move ${k}: emits an event not exported from events.ts`),
              ...timed.time,
            }];
          })),
          notFrom: { error: `${pascal(name)}Not${pascal(states[0] ?? "")}`, exit: m.notFrom.exit, code: codeOf(prefix.get(name) ?? "??", MACHINE_NUMBER) },
        }
      : null;
    if (m && m.thing !== t.thing) problems.push(`${where}/machine.ts: is a machine of another thing`);
    const invariants = invariantsOf(t, { thingNames, errorNames, verbs }, problems);
    const errors = Object.fromEntries(inDeclarationOrder(t.errors).map(([n, e], i) => [n, { fields: fieldsModel(e.fields, `${where}/errors.ts ${n}`, "an error"), exit: e.exit, code: codeOf(prefix.get(name) ?? "??", i + 1) }]));
    const entry = {
      name, identifier: pascal(name), code: prefix.get(name) ?? "??", description: Blanks.isBlank(t.thing.description) ? "" : t.thing.description, fields, lives: (t.thing.lives ?? "database") as ThingModel["lives"], ...storeOf(t.thing.store, where), ...(invariants ? { invariants } : {}), machine,
      events: Object.fromEntries(byName(t.events).map(([n, e]) => [n, fieldsModel(e.fields, `${where}/events.ts ${n}`, "an event")])),
      errors, ...(missable.has(t.thing) ? { notFound: notFoundOf(pascal(name), prefix.get(name) ?? "??", errors) } : {}),
      roles: [...t.roles.keys()].sort(),
      roleRules: Object.fromEntries(byName(t.roles).map(([role, { rule }]) => [role, Blanks.isBlank(rule) ? null : rule.toString()])),
      from: t.from,
    };
    things[name] = { ...entry, hash: hashOf(entry) };
  }

  const allowedModel = (a: Allowed, where: string): AllowedModel => {
    if (a.kind === "anyone") return { kind: "anyone" };
    if (a.kind === "signed-in") return { kind: "signed-in" };
    if (a.kind === "keeper") return { kind: "keeper" };
    const name = (r: unknown) => roleNames.get(r as never) ?? problem(problems, `${where}: uses a role not exported from a roles.ts`);
    if (a.kind === "role") return { kind: "role", role: name(a) };
    return { kind: "role-of", role: name(a.role), path: a.path };
  };

  // The keeper is refused NotAllowed by every operation that doesn't list it, even one open to anyone (M8-checks call 4):
  // so once a blueprint has a keeper, no operation's refusals leave NotAllowed out. A blueprint with none is unchanged.
  const keeperUsed = [...layout.things.values()].some((t) => [...t.verbs.values()].some((v) => Array.isArray(v.declaration.allowed) && v.declaration.allowed.some((a) => a.kind === "keeper")));
  const openToAll = (allowed: ReadonlyArray<AllowedModel>) => !keeperUsed && allowed.every((a) => a.kind === "anyone");

  const operations: Record<string, OperationModel> = {};
  const blankOperations: Record<string, BlankOperationModel> = {};
  for (const [thing, t] of [...layout.things].sort(([a], [b]) => a.localeCompare(b))) {
    for (const [verb, { file, declaration: op }] of [...t.verbs].sort(([a], [b]) => a.localeCompare(b))) {
      const parts = op.kind === "read"
        ? { [op.by === "list" ? "where" : "fields"]: op.by === "list" ? op.where : op.fields, allowed: op.allowed }
        : { description: op.description, payload: op.payload, answer: op.answer, allowed: op.allowed, errors: op.errors, steps: op.steps, move: op.move };
      const name = `${thing}.${verb}`;
      const incomplete = blankIn(name, parts);
      const steps = op.kind === "operation" && !Blanks.isBlank(op.steps) ? Object.entries(op.steps) : [];
      blankIn(name, Object.fromEntries(steps.map(([key, step]) => [`steps.${key}`, step])));
      if (incomplete) {
        blankOperations[name] = {
          name, thing, verb, file, kind: op.kind, from: t.from, blanks: blanks[name]!,
          ...(op.kind === "operation" && !Blanks.isBlank(op.description) ? { description: op.description } : {}),
        };
        continue;
      }
      const model = operationModel(thing, verb, file, t.from, op);
      operations[name] = model;
    }
  }

  function operationModel(thing: string, verb: string, file: string, from: OperationModel["from"], declared: Operation | Read): OperationModel {
    if (declared.thing !== layout.things.get(thing)?.thing) problems.push(`${file}: declares an operation of another thing`);
    if (declared.kind === "read") return readModel(thing, verb, file, from, declared);
    const op = declared;
    const onDevice = op.runs === "client" && (layout.things.get(thing)?.from.kind ?? "app") !== "app"; // a plugin's, with its code for each host
    if (op.runs !== "server" && !onDevice) problems.push(`${file}: runs "${op.runs}" is not supported yet: ${RUNS_NEEDS[op.runs] ?? "an unknown place"}`); else if (onDevice) problems.push(...deviceProblems(file, op));
    const machine = things[thing]?.machine;
    const move = op.move
      ? { key: op.move.key, from: op.move.from, to: op.move.to, emits: eventNames.get(op.move.emits) ?? "?" }
      : null;
    if (op.move && op.move.machine !== layout.things.get(thing)?.machine) problems.push(`${file}: moves another thing's machine`);
    problems.push(...unfillable(op, `${thing}.${verb}`, thing, move?.emits ?? "?", `${layout.things.get(thing)?.base ?? `blueprint/things/${thing}`}/events.ts`));
    const errors = op.errors.map((e) => errorNames.get(e) ?? problem(problems, `${file}: declares an error not exported from an errors.ts`));
    // Each refusal goes on the wire by its name: two classes of one name in one union can't be told apart.
    for (const tag of new Set(errors.filter((n, i) => errors.indexOf(n) !== i && n !== "?"))) {
      problems.push(`${file}: ${thing}.${verb}'s errors are a union with two classes tagged ${tag}, so the refusal is ambiguous on the wire: rename one`);
    }
    const allowed = op.allowed.map((a) => allowedModel(a, file));
    // Only a move made by time is the keeper's, and a move made by time is no one else's (K23 section 3).
    const madeByTime = op.move !== undefined && op.move.by !== undefined;
    const listsKeeper = allowed.some((a) => a.kind === "keeper");
    if (madeByTime && !listsKeeper) problems.push(`${file}: ${thing}.${op.move!.key} is made by time, so its operation must be allowed to the keeper (allowed: [Blueprint.keeper])`);
    if (listsKeeper && !madeByTime) problems.push(`${file}: allows the keeper, but ${op.move ? `${thing}.${op.move.key}` : "it"} is not a move made by time: the keeper calls only those`);
    const found = foundModel(op, (x) => thingNames.get(x), (x) => things[x]?.notFound?.error);
    const steps = Object.fromEntries(Object.entries(op.steps).map(([k, s]) => [k,
      Blanks.isBlank(s) ? { name: `${thing}.${verb}.${k}`, type: "blank" } : stepModel(thing, verb, k, s, op.errors, file)]));
    // The refusals the runtime makes for the rules this operation can break (G5), never among its `errors`.
    const broken = breakersOf({ thing, move, steps }, things);
    if (op.runs === "client" && broken.breaks.length > 0) problems.push(`${file}: ${thing}.${verb} runs on the device, which has no store, and can break ${broken.breaks.join(", ")}`);
    const refusals = [
      ...errors,
      ...Object.keys(broken.refusals),
      ...(move && move.from.length > 0 && machine ? [machine.notFrom.error] : []),
      ...new Set(Object.values(found.notFound ?? {}).filter((e) => !errors.includes(e))),
      ...(openToAll(allowed) ? [] : ["NotAllowed"]),
      // An operation that keeps its answer by request key refuses a key reused with another payload (HAN-10, G3).
      ...(op.idempotent === "request" ? [IDEMPOTENCY_CONFLICT] : []),
    ];
    const payload = fieldsModel(op.payload, `${file} payload`, "a payload");
    const answer = fieldsModel(op.answer, `${file} answer`, "answer");
    const mints = mintsOf(move?.from.length === 0, thing, answer, payload);
    const entry = {
      kind: "operation" as const,
      name: `${thing}.${verb}`, thing, verb, identifier: camel(verb), file, from, description: op.description,
      payload, answer, move, errors, ...(Object.keys(broken.refusals).length > 0 ? { invariants: broken.refusals } : {}), breaks: broken.breaks, refusals, allowed, ...found, ...(mints !== undefined ? { mints } : {}),
      steps,
      ...(blanks[`${thing}.${verb}`] ? { blanks: blanks[`${thing}.${verb}`]! } : {}),
      idempotent: op.idempotent ?? null,
      runs: (onDevice ? "client" : "server") as "server" | "client", test: op.test,
      budget: op.budget ? { p95Ms: Duration.toMillis(op.budget.p95) } : null,
    };
    const split = crossStore(file, `${thing}.${verb}`, thing, move !== null, entry.steps, things);
    if (split) problems.push(split);
    return { ...entry, hash: hashOf(entry) };
  }

  /** A step: a span named after it; a call step also says which call of which mounted adapter, or why it can't. */
  function stepModel(thing: string, verb: string, key: string, step: Step, declared: ReadonlyArray<AnyErrorClass>, file: string): StepModel {
    const plain = {
      name: `${thing}.${verb}.${key}`, type: step.type, ...writesOf((step as { readonly writes?: ReadonlyArray<Thing> }).writes, file),
      ...(step.optional ? { optional: true } : {}),
    };
    if (step.type !== "call") return plain;
    const { call } = step as CallStep;
    const reach = layout.calls.get(call);
    const where = `${file}: step ${key}`;
    if (!reach) {
      const missing = (call as { readonly kind?: string } | undefined)?.kind === "missing-call";
      problems.push(missing
        ? `${where} calls ${(call as unknown as { name: string }).name}, which the adapter doesn't have`
        : `${where} calls something that no mounted adapter offers: mount its adapter (ortho add adapter <package>) and write the call as <mount>.calls.<call>`);
      return plain;
    }
    if (!reach.included) problems.push(`${where} calls ${reach.call} of ${reach.package}, which ${reach.file} doesn't include: add p.include(p.calls.${reach.call}) there`);
    for (const e of call.errors) {
      if (!declared.includes(e)) problems.push(`${where} calls ${reach.call}, which may fail as ${errorNames.get(e) ?? "an error that is not declared"}: declare it in the operation's errors`);
    }
    return { ...plain, call: { mount: reach.mount, call: reach.call, mode: call.mode } };
  }

  /** A read: answered from the thing's records with no handler, so no move, no steps, no declared errors. */
  function readModel(thing: string, verb: string, file: string, from: OperationModel["from"], read: Read): OperationModel {
    const allowed = read.allowed.map((a) => allowedModel(a, file));
    const list = read.by === "list";
    const t = layout.things.get(thing);
    if (list && t?.thing?.lives === "actor") problems.push(`${file}: a list read needs a thing that lives in the database, and ${thing} lives as actors`);
    if (list && read.where.includes("state") && !t?.machine) problems.push(`${file}: where "state" needs ${thing} to have a machine`);
    if (list && (!Number.isInteger(read.page) || (read.page ?? 0) < 1 || (read.page ?? 0) > 1000)) problems.push(`${file}: page must be a whole number from 1 to 1000`);
    const payload = Object.fromEntries(Object.entries(fieldsModel(read.payload, `${file} payload`, "a payload")).map(([k, f]) => [k, read.optional.includes(k) ? { ...f, optional: true as const } : f]));
    const entry = {
      kind: "read" as const,
      name: `${thing}.${verb}`, thing, verb, identifier: camel(verb), file, from,
      description: list
        ? `List ${thing}s, ${read.order === "newest" ? "newest first" : "oldest first"}, ${read.page} to a page${read.where.length > 0 ? `, filtered by ${read.where.join(", ")}` : ""}.`
        : `Read one ${thing} by its id: ${read.fields.map(String).join(", ")}.`,
      payload, answer: fieldsModel(read.answer, `${file} answer`, "a read answer"),
      move: null, errors: [], breaks: [], refusals: openToAll(allowed) ? [] : ["NotAllowed"], allowed,
      steps: {}, idempotent: null, runs: "server" as const, test: "unit" as const,
      budget: read.budget ? { p95Ms: Duration.toMillis(read.budget.p95) } : null,
      ...(list ? { list: { where: [...read.where], order: read.order ?? "newest", page: read.page ?? 0 } } : {}),
    };
    return { ...entry, hash: hashOf(entry) };
  }

  const refusals = refusalsOf(things, problems);
  problems.push(...exitClashes(things), ...operationExitClashes(things, operations), ...notFoundShapes(things));
  const values = Object.fromEntries([...layout.values].sort(([a], [b]) => a.localeCompare(b)).map(([n, v]) => [n, v.meta]));
  const environments = environmentsOf(layout, problems);
  const stores = storesOf(layout, problems);
  const { journeyBlanks, ...stories } = storiesOf(layout, operations, allowedModel);
  const allBlanks = { ...blanks, ...journeyBlanks };
  return {
    model: { refusals, values, things, ...(Object.keys(stores).length > 0 ? { stores } : {}), operations, ...stories, ...(Object.keys(blankOperations).length > 0 ? { blankOperations } : {}), ...(Object.keys(allBlanks).length > 0 ? { blanks: allBlanks } : {}), ...(Object.keys(environments).length > 0 ? { environments } : {}) },
    problems,
  };
};


/** Where a field is declared: `Blueprint.issued` is allowed in one of these. */
type Place = "answer" | "a payload" | "an error" | "an event" | "a thing's field" | "a read answer";

const problem = (problems: Array<string>, p: string): string => {
  problems.push(p);
  return "?";
};
