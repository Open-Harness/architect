// The things of the model: fields, machine, events, errors and roles, and the refusals lock that gives each refusal its code.
import type { AnyErrorClass, Event, Store, Thing } from "orthograph";
import { Blanks } from "orthograph/server";
import { Times } from "#modules/time/service.js";
import { RefusalLock } from "#modules/lock/service.js";
import type { Lock, Wanted } from "#modules/lock/types.js";
import type { ThingModel } from "../types.ts";
import { MACHINE_NUMBER, inDeclarationOrder } from "./codes.ts";
import { NOT_FOUND_NUMBER, notFoundOf } from "./found.ts";
import { roleRuleOf } from "./bits.ts";
import { hashOf } from "./hash.ts";
import { invariantsOf } from "./invariants.ts";
import { pascal, type Layout } from "./layout.ts";
import { lockFields } from "./lock-fields.ts";
import type { Names } from "./money.ts";
import type { fieldsOf } from "./fields.ts";

export interface ThingsEnv {
  readonly layout: Layout;
  readonly before: Lock;
  readonly problems: Array<string>;
  readonly prefix: ReadonlyMap<string, string>;
  readonly missable: ReadonlySet<Thing>;
  readonly verbs: ReadonlyArray<{ readonly file: string; readonly errors: ReadonlyArray<AnyErrorClass> }>;
  readonly chain: { readonly is: (t: Thing | undefined) => boolean; readonly has: boolean; readonly storeNames: ReadonlyMap<Store, string> };
  readonly names: Names;
  readonly thingNames: ReadonlyMap<Thing, string>;
  readonly eventNames: ReadonlyMap<Event, string>;
  readonly errorNames: ReadonlyMap<AnyErrorClass, string>;
  readonly fieldsModel: ReturnType<typeof fieldsOf>["fieldsModel"];
  readonly fieldModel: ReturnType<typeof fieldsOf>["fieldModel"];
  readonly blankIn: (owner: string, parts: Record<string, unknown>) => boolean;
}

/** A module's exports in name order: a namespace's own order differs between loaders, and the model must not. */
const byName = <V>(m: ReadonlyMap<string, V>) => [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

const problem = (problems: Array<string>, p: string): string => {
  problems.push(p);
  return "?";
};

export const thingsOf = (env: ThingsEnv): { readonly things: Record<string, ThingModel>; readonly lock: Lock } => {
  const { layout, before, problems, prefix, missable, verbs, chain, thingNames, eventNames, errorNames, fieldsModel, fieldModel, blankIn } = env;
  /** The declared store a thing lives in, by name: absent for the default store. */
  const storeOf = (store: Thing["store"], where: string) =>
    store ? { store: chain.storeNames.get(store) ?? problem(problems, `${where}/thing.ts: lives in a store that isn't a default export of a stores/<name>.ts`) } : {};
  // G4's `unique:` key is retired (S-30): a thing still carrying it is refused, by thing name only (never a field name).
  for (const [n, t] of layout.things) if (t.thing && "unique" in t.thing) problems.push(`thing ${n} declares unique, which is retired: declare it with Blueprint.invariant.unique in blueprint/things/${n}/invariants.ts`);

  // The id prefixes some thing owns: its own `id` field's. A field that names another prefix names nothing.
  // `per` is the identity's own: the people who sign in are a thing of Better Auth's, which a blueprint refers to without declaring.
  const owned = new Set(["per", ...[...layout.things.values()].flatMap((t) => { const m = t.thing?.fields["id"]?.value.meta; return m?.type === "id" ? [m.prefix] : []; })]);

  const wanted: Array<Wanted> = [];
  const drafts = [...layout.things].sort(([a], [b]) => a.localeCompare(b)).flatMap(([name, t]) => {
    if (!t.thing) return [];
    const where = t.base;
    const onChain = chain.is(t.thing);
    const ctx = { owner: { name, thing: t.thing }, chain: onChain } as const;
    const code = prefix.get(name) ?? "??";
    const fields = Object.fromEntries(
      Object.entries(t.thing.fields).map(([k, f]) => [k, fieldModel(f.issued === true ? f : f.from ?? f.value, `${where}/thing.ts field ${k}`, { place: "a thing's field", ...ctx })]),
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
          moves: Object.fromEntries(Object.entries(m.moves).map(([k, mv]) => [k, {
            from: mv.from, to: mv.to, emits: eventNames.get(mv.emits) ?? problem(problems, `${where}/machine.ts move ${k}: emits an event not exported from events.ts`),
            ...Times.timed({ name, thing: t.thing!, key: k, move: mv, file: `${where}/machine.ts`, problems }),
          }])),
          notFrom: { error: `${pascal(name)}Not${pascal(states[0] ?? "")}`, exit: m.notFrom.exit },
        }
      : null;
    if (m && m.thing !== t.thing) problems.push(`${where}/machine.ts: is a machine of another thing`);
    const invariants = invariantsOf(t, { thingNames, errorNames, verbs }, problems);
    if (t.thing.versions !== undefined && !(t.thing.versions.key in t.thing.fields)) problems.push(`${where}/thing.ts: versions key ${t.thing.versions.key} is not a field of ${name}`);
    for (const [k, f] of Object.entries(t.thing.fields)) {
      const meta = f.value.meta;
      if (k !== "id" && meta.type === "id" && !owned.has(meta.prefix)) problems.push(`${where}/thing.ts field ${k}: the id prefix "${meta.prefix}" is no thing's own id: name a prefix some thing owns`);
    }
    if (onChain && t.invariants.size > 0) problems.push(`${where}/invariants.ts: ${name} lives in a chain store, which enforces no invariants yet: a chain-stored thing declares none`);
    const errors = inDeclarationOrder(t.errors).map(([n, e]) => ({ name: n, fields: fieldsModel(e.fields, `${where}/errors.ts ${n}`, { place: "an error", ...ctx }), exit: e.exit }));
    const events = Object.fromEntries(byName(t.events).map(([n, e]) => [n, fieldsModel(e.fields, `${where}/events.ts ${n}`, { place: "an event", ...ctx })]));
    for (const role of t.roles.values()) {
      if (role.who !== undefined && role.who.of !== t.thing) problems.push(`${where}/roles.ts: a who role names a field of another thing; a role's who is a field of ${name}`);
    }
    const roleRules = Object.fromEntries(byName(t.roles).map(([role, r]) => [role, r.who !== undefined ? { kind: "who" as const, who: r.who.key } : Blanks.isBlank(r.rule) ? null : roleRuleOf(r)]));
    // Every refusal this thing has, for the lock: its declared errors in order, the machine's 900 and the generated not-found, 901.
    const owner = name;
    const idValue = t.thing.fields["id"]?.value.meta;
    wanted.push(
      ...errors.map((e): Wanted => ({ name: e.name, owner, from: t.from.kind !== "app" ? `${t.from.package}/blueprint/things/${t.from.thing}/errors.js` : `${where}/errors.ts`, fields: lockFields(e.fields), prefix: code })),
      ...(machine ? [{ name: machine.notFrom.error, owner, fields: { state: { value: "text", max: 64 } }, code: `${code}-${MACHINE_NUMBER}`, prefix: code } satisfies Wanted] : []),
      ...(missable.has(t.thing) && !t.errors.has(`${pascal(name)}NotFound`)
        ? [{ name: `${pascal(name)}NotFound`, owner, fields: { id: idValue?.type === "id" ? { value: "id", prefix: idValue.prefix } : { value: "text", max: 200 } }, code: `${code}-${NOT_FOUND_NUMBER}`, prefix: code } satisfies Wanted] : []),
    );
    const stateNumbers = onChain && m ? Object.fromEntries(["absent", ...states].map((s, i) => [s, i])) : undefined;
    return [{ name, t, where, code, fields, machine, invariants, errors, events, roleRules, roles: [...t.roles.keys()].sort(), stateNumbers, onChain }];
  });

  const runtime = RefusalLock.runtime(chain.has);
  const { lock, codes } = RefusalLock.assign(before, [...runtime, ...wanted]);
  const given = new Map(wanted.map((w, i) => [`${w.owner}/${w.name}`, codes[runtime.length + i] ?? "??"] as const));
  const codeFor = (thing: string, error: string) => given.get(`${thing}/${error}`) ?? "??";
  const things: Record<string, ThingModel> = {};
  for (const d of drafts) {
    const errors = Object.fromEntries(d.errors.map((e) => [e.name, { fields: e.fields, exit: e.exit, code: codeFor(d.name, e.name) }]));
    const machine = d.machine ? { ...d.machine, notFrom: { ...d.machine.notFrom, code: `${d.code}-${MACHINE_NUMBER}` } } : null;
    const entry = {
      name: d.name, identifier: pascal(d.name), code: d.code, description: Blanks.isBlank(d.t.thing!.description) ? "" : d.t.thing!.description, fields: d.fields, ...(d.t.thing!.versions ? { versions: { key: d.t.thing!.versions.key } } : {}),
      lives: (d.t.thing!.lives ?? "database") as ThingModel["lives"], ...storeOf(d.t.thing!.store, d.where), ...(d.invariants ? { invariants: d.invariants } : {}), machine,
      events: d.events,
      errors, ...(missable.has(d.t.thing!) ? { notFound: notFoundOf(pascal(d.name), `${d.code}-${NOT_FOUND_NUMBER}`, errors) } : {}),
      roles: d.roles, roleRules: d.roleRules, ...(d.stateNumbers ? { stateNumbers: d.stateNumbers } : {}),
      from: d.t.from,
    };
    things[d.name] = { ...entry, hash: hashOf(entry) };
  }
  return { things, lock };
};
