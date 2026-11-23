// Turns the layout into the model: every declaration named, every reference resolved, every entry hashed.
import { Duration } from "effect";
import type { AnyErrorClass, CallStep, Operation, Read, Step, Thing, Value } from "orthograph";
import type { AllowedModel, BlankOperationModel, Model, OperationModel, StepModel, ThingModel } from "../types.ts";
import { admitsAgent } from "orthograph";
import { Blanks } from "orthograph/server";
import { EMPTY_LOCK } from "#modules/lock/service.js";
import type { Lock } from "#modules/lock/types.js";
import { approvalOf } from "./approval.ts";
import { IDEMPOTENCY_CONFLICT, prefixes, refusalsOf } from "./codes.ts";
import { foundModel, mintsOf, missedBy } from "./found.ts";
import { exitClashes, notFoundShapes, operationExitClashes } from "./exits.ts";
import { unfillable } from "./fillable.ts";
import { RUNS_NEEDS, deviceProblems } from "./device.ts";
import { Times } from "#modules/time/service.js";
import { environmentsOf } from "./environments.ts";
import { allowedOf } from "./allowed.ts";
import { storiesOf } from "./journeys.ts";
import { hashOf } from "./hash.ts";
import { alertRulesOf } from "./rules.ts";
import { crossStore, storesOf } from "./stores.ts";
import { breakersOf, declaredErrors } from "./invariants.ts";
import { camel, type Layout } from "./layout.ts";
import { assetsOf, tokensUsed } from "./assets.ts";
import { fieldsOf } from "./fields.ts";
import { chainOperationProblems, chainReadProblems, collisionProblems } from "./operations.ts";
import { metaOf, type Names } from "./money.ts";
import { thingsOf } from "./things.ts";

export const describe = (layout: Layout, before: Lock = EMPTY_LOCK): { model: Model; problems: Array<string>; lock: Lock } => {
  const problems = [...layout.problems];
  const valueNames = new Map<Value, string>([...layout.values].map(([n, v]) => [v, n]));
  const schemaNames = new Map([...layout.values].map(([n, v]) => [v.schema, n]));
  const thingNames = new Map([...layout.things].flatMap(([n, t]) => (t.thing ? [[t.thing, n] as const] : [])));
  const eventNames = new Map([...layout.things.values()].flatMap((t) => [...t.events].map(([n, e]) => [e, n] as const)));
  const errorNames = new Map([...layout.things.values()].flatMap((t) => [...t.errors].map(([n, e]) => [e, n] as const)));
  const roleNames = new Map(
    [...layout.things.values()].flatMap((t) => [...t.roles].map(([n, r]) => [r, `${t.name}.${n}`] as const)),
  );
  const names: Names = { assets: new Map([...layout.assets].map(([n, a]) => [a.asset, n])), things: thingNames };
  const { fieldModel, fieldsModel } = fieldsOf({ valueNames, schemaNames, thingNames, roleNames, names, problems });

  // What isn't written yet, by declaration and part.
  const blanks: Record<string, Array<string>> = {};
  const blankIn = (owner: string, parts: Record<string, unknown>) => {
    const found = Object.entries(parts).flatMap(([k, v]) => (Blanks.isBlank(v) ? [`${k}: ${v.what}`] : []));
    if (found.length > 0) blanks[owner] = [...(blanks[owner] ?? []), ...found];
    return found.length > 0;
  };

  const storeNames = new Map([...layout.stores].map(([n, s]) => [s.store, n] as const));
  const chainStores = new Set([...layout.stores].filter(([, s]) => s.store.of === "chain.evm").map(([n]) => n));
  /** Whether a thing lives in a chain store: its operations run on the chain, and its fields have Solidity types. */
  const onChain = (thing: Thing | undefined) => thing?.store !== undefined && chainStores.has(storeNames.get(thing.store) ?? "");
  const hasChain = chainStores.size > 0;
  const assets = assetsOf(layout, problems);

  const prefix = prefixes(layout.things, problems);
  // A thing some operation's payload names where no role check reads it gets a `<Thing>NotFound` (K16, M1.46).
  const missable = new Set([...layout.things.values()].flatMap((t) => [...t.verbs.values()].flatMap(({ declaration: d }) => missedBy(d, Blanks.isBlank))));
  const verbs = [...layout.things.values()].flatMap((t) => [...t.verbs.values()].map(({ file, declaration: d }) => ({ file, errors: d.kind === "operation" ? declaredErrors(d.errors) : [] })));
  const { things, lock } = thingsOf({ layout, before, problems, prefix, missable, verbs, chain: { is: onChain, has: hasChain, storeNames }, names, thingNames, eventNames, errorNames, fieldsModel, fieldModel, blankIn });

  const allowedModel = allowedOf(layout, roleNames, problems);
  const keeperUsed = Times.keeperUsed([...layout.things.values()].flatMap((t) => [...t.verbs.values()].map((v) => v.declaration.allowed)));
  // With a keeper in the blueprint, even an operation open to anyone refuses it NotAllowed (M8-checks call 4).
  const openToAll = (allowed: ReadonlyArray<AllowedModel>) => !keeperUsed && allowed.every((a) => a.kind === "anyone");
  const operations: Record<string, OperationModel> = {};
  const blankOperations: Record<string, BlankOperationModel> = {};
  const entries = new Map<string, Array<{ readonly file: string; readonly name: string; readonly identifier: string }>>();
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
      operations[name] = operationModel(thing, verb, file, t.from, op);
      const store = t.thing?.store === undefined ? undefined : storeNames.get(t.thing.store);
      if (store !== undefined && chainStores.has(store)) entries.set(store, [...(entries.get(store) ?? []), { file, name, identifier: camel(verb) }]);
    }
  }
  // One contract per chain store: its verbs share the generated entries' names.
  for (const verbsOf of entries.values()) problems.push(...collisionProblems(verbsOf));

  function operationModel(thing: string, verb: string, file: string, from: OperationModel["from"], declared: Operation | Read): OperationModel {
    if (declared.thing !== layout.things.get(thing)?.thing) problems.push(`${file}: declares an operation of another thing`);
    if (declared.kind === "read") return readModel(thing, verb, file, from, declared);
    const op = declared;
    const chain = onChain(layout.things.get(thing)?.thing);
    const onDevice = op.runs === "client" && (layout.things.get(thing)?.from.kind ?? "app") !== "app"; // a plugin's, with its code for each host
    // On a chain store where it runs is the compiler's word, so a written `runs` is refused in operations.ts.
    if (!chain && op.runs !== "server" && !onDevice) problems.push(`${file}: runs "${op.runs}" is not supported yet: ${RUNS_NEEDS[op.runs] ?? "an unknown place"}`); else if (onDevice) problems.push(...deviceProblems(file, op));
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
    problems.push(...Times.keeper({ file, name: `${thing}.${verb}`, kind: "operation", move: op.move, allowed }));
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
    const ctx = { owner: { name: thing, thing: op.thing }, chain } as const;
    const payload = fieldsModel(op.payload, `${file} payload`, { place: "a payload", ...ctx });
    const answer = fieldsModel(op.answer, `${file} answer`, { place: "answer", ...ctx });
    const mints = mintsOf(move?.from.length === 0, thing, answer, payload);
    if (chain) problems.push(...chainOperationProblems({ file, name: `${thing}.${verb}`, thing, op, roleNames, payload, answer, event: move ? things[thing]?.events[move.emits] : undefined, emits: move?.emits ?? "?", mints }));
    const entry = {
      kind: "operation" as const,
      name: `${thing}.${verb}`, thing, verb, identifier: camel(verb), file, from, description: op.description,
      payload, answer, move, errors, ...(Object.keys(broken.refusals).length > 0 ? { invariants: broken.refusals } : {}), breaks: broken.breaks, refusals, allowed, agentTool: !onDevice && admitsAgent(op.allowed), ...found, ...(mints !== undefined ? { mints } : {}),
      steps,
      ...(blanks[`${thing}.${verb}`] ? { blanks: blanks[`${thing}.${verb}`]! } : {}),
      idempotent: op.idempotent ?? null,
      ...approvalOf(op, file, problems),
      runs: (chain ? "chain" : onDevice ? "client" : "server") as OperationModel["runs"], test: op.test,
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
  /** The names of the things a step writes: only when it names any. */
  function writesOf(writes: ReadonlyArray<Thing> | undefined, where: string) {
    return writes ? { writes: writes.map((w) => thingNames.get(w) ?? problem(problems, `${where}: a step writes a thing that isn't in the blueprint`)) } : {};
  }

  /** A read: answered from the thing's records with no handler, so no move, no steps, no declared errors. */
  function readModel(thing: string, verb: string, file: string, from: OperationModel["from"], read: Read): OperationModel {
    const allowed = read.allowed.map((a) => allowedModel(a, file));
    problems.push(...Times.keeper({ file, name: `${thing}.${verb}`, kind: "read", move: undefined, allowed }));
    const list = read.by === "list";
    const t = layout.things.get(thing);
    const chain = onChain(t?.thing);
    if (list && t?.thing?.lives === "actor") problems.push(`${file}: a list read needs a thing that lives in the database, and ${thing} lives as actors`);
    if (chain) problems.push(...chainReadProblems(file, `${thing}.${verb}`, read));
    if (list && read.where.includes("state") && !t?.machine) problems.push(`${file}: where "state" needs ${thing} to have a machine`);
    if (list && (!Number.isInteger(read.page) || (read.page ?? 0) < 1 || (read.page ?? 0) > 1000)) problems.push(`${file}: page must be a whole number from 1 to 1000`);
    const ctx = { owner: { name: thing, thing: read.thing }, chain: chain && !list } as const;
    const payload = Object.fromEntries(Object.entries(fieldsModel(read.payload, `${file} payload`, { place: "a payload", ...ctx })).map(([k, f]) => [k, read.optional.includes(k) ? { ...f, optional: true as const } : f]));
    // A read's `state` is the machine's number on chain, a uint8 (M6-chain item 2).
    const answer = Object.fromEntries(Object.entries(fieldsModel(read.answer, `${file} answer`, { place: "a read answer", ...ctx })).map(([k, f]) => [k, ctx.chain && k === "state" ? { ...f, solidity: "uint8" } : f]));
    const entry = {
      kind: "read" as const,
      name: `${thing}.${verb}`, thing, verb, identifier: camel(verb), file, from,
      description: list
        ? `List ${thing}s, ${read.order === "newest" ? "newest first" : "oldest first"}, ${read.page} to a page${read.where.length > 0 ? `, filtered by ${read.where.join(", ")}` : ""}.`
        : `Read one ${thing} by its id: ${read.fields.map(String).join(", ")}.`,
      payload, answer,
      move: null, errors: [], breaks: [], refusals: openToAll(allowed) ? [] : ["NotAllowed"], allowed, agentTool: admitsAgent(read.allowed),
      steps: {}, idempotent: null, runs: (chain ? "chain" : "server") as OperationModel["runs"], test: "unit" as const,
      budget: read.budget ? { p95Ms: Duration.toMillis(read.budget.p95) } : null,
      ...(list ? { list: { where: [...read.where], order: read.order ?? "newest", page: read.page ?? 0 } } : {}),
    };
    return { ...entry, hash: hashOf(entry) };
  }

  const refusals = refusalsOf(things, problems, hasChain);
  problems.push(...exitClashes(things), ...operationExitClashes(things, operations), ...notFoundShapes(things));
  const values = Object.fromEntries([...layout.values].sort(([a], [b]) => a.localeCompare(b)).map(([n, v]) => [n, metaOf(v.meta, `${layout.valueFiles.get(n) ?? "blueprint/values"}: value ${n}`, undefined, names, problems)]));
  const environments = environmentsOf(layout, problems, tokensUsed(things, operations));
  const stores = storesOf(layout, problems);
  const { journeyBlanks, ...stories } = storiesOf(layout, operations, allowedModel, problems);
  const allBlanks = { ...blanks, ...journeyBlanks };
  const alertRules = alertRulesOf({ operations, refusals, things, journeys: stories.journeys, environments });
  return {
    model: { refusals, values, ...(Object.keys(assets).length > 0 ? { assets } : {}), things, ...(Object.keys(stores).length > 0 ? { stores } : {}), operations, ...stories, ...(Object.keys(blankOperations).length > 0 ? { blankOperations } : {}), ...(Object.keys(allBlanks).length > 0 ? { blanks: allBlanks } : {}), ...(Object.keys(environments).length > 0 ? { environments } : {}), alertRules },
    problems,
    lock,
  };
};

const problem = (problems: Array<string>, p: string): string => {
  problems.push(p);
  return "?";
};
