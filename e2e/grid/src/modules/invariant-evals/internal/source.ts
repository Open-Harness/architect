import type { ProjectEvidence } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";
import { listedErrors, over, type Found } from "./over.ts";

const same = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => a.length === b.length && a.every((x, i) => x === b[i]);
const endpointOf = (e: ProjectEvidence, op: { readonly thing: string; readonly verb: string }) => e.files[`generated/api/src/${op.thing}/${op.verb}.ts`] ?? "";

/** Every other rule that names `refuse` as its refusal, and every operation that maps it to a rule other than `full`: an error has one owner (G5 section 3). */
const ownerProblems = (e: ProjectEvidence, f: Found): ReadonlyArray<string> => {
  const refuse = f.rule.refuse;
  if (refuse === undefined) return [];
  return [
    ...Object.values(e.model.things).flatMap((t) => Object.entries(t.invariants ?? {}).filter(([n, r]) => r.refuse === refuse && `${t.name}.${n}` !== f.full).map(([n]) => `${refuse} is also ${t.name}.${n}'s refusal: an error has one owner`)),
    ...Object.values(e.model.operations).filter((op) => op.invariants?.[refuse] !== undefined && op.invariants[refuse] !== f.full).map((op) => `${op.name} maps ${refuse} to ${op.invariants![refuse]}, not to ${f.full}`),
  ];
};

/** Every operation whose `invariants` maps some refusal to the rule. */
const mappers = (e: ProjectEvidence, f: Found) => Object.values(e.model.operations).flatMap((op) => Object.entries(op.invariants ?? {}).filter(([, rule]) => rule === f.full).map(([refusal]) => ({ op, refusal })));

/**
 * invariant.model: the rule is in `things.<thing>.invariants` as a unique rule over fields the thing has, held in states its machine has, refusing an
 * error the thing declares whose own fields are among the key (the runtime fills them from the caller's row), with a description that is words when
 * written; every operation the model says can break it lists the refusal among its `refusals` and not among its `errors`, and a rule that refuses nothing is mapped by none.
 */
export const model = over("invariant.model", (f, e) => {
  const { rule, thing } = f;
  const states = thing.machine?.states ?? [];
  const declared = rule.refuse === undefined ? undefined : thing.errors?.[rule.refuse];
  return [
    ...(rule.kind === "unique" ? [] : [`its kind is "${rule.kind}", the only kind Stage 1 has is "unique"`]),
    ...(rule.fields.length === 0 ? ["it keys on no field"] : []),
    ...rule.fields.filter((x) => thing.fields[x] === undefined).map((x) => `it keys on ${x}, which ${thing.name} has no field of`),
    ...rule.fields.filter((x, i) => rule.fields.indexOf(x) !== i).map((x) => `it keys on ${x} twice`),
    ...(rule.while === undefined || Array.isArray(rule.while) ? [] : [`its scope is ${JSON.stringify(rule.while)}, not a list of states`]),
    ...(Array.isArray(rule.while) ? rule.while : []).filter((s, i, all) => all.indexOf(s) !== i).map((s) => `it holds while ${s} twice`),
    ...(Array.isArray(rule.while) ? rule.while : []).filter((s) => !states.includes(s)).map((s) => `it holds while ${s}, which is not a state of ${thing.name}'s machine (${states.join(", ") || "it has none"})`),
    ...(rule.description === undefined || (typeof rule.description === "string" && rule.description.trim() !== "") ? [] : ["its description is empty: a rule with none says nothing, a rule with one says it"]),
    ...(rule.refuse === undefined ? [] : declared === undefined ? [`it refuses ${rule.refuse}, which ${thing.name} does not declare in its errors`]
      : Object.keys(declared.fields).filter((x) => !rule.fields.includes(x)).map((x) => `${rule.refuse} carries ${x}, which is not one of the rule's key fields: the runtime fills it from the caller's own row`)),
    ...mappers(e, f).filter((m) => m.refusal !== rule.refuse).map((m) => rule.refuse === undefined ? `${m.op.name} breaks a rule that refuses nothing (it maps ${m.refusal} to it)` : `${m.op.name} maps ${m.refusal} to the rule, which refuses ${rule.refuse}`),
    ...(rule.refuse === undefined ? []
      : f.breakers.length === 0 ? [`no operation in the model can break it, so ${rule.refuse} is never given`]
      : f.breakers.flatMap((op) => [
        ...((op.refusals ?? []).includes(rule.refuse!) ? [] : [`${op.name} breaks it and does not list ${rule.refuse} among its refusals`]),
        ...((op.errors ?? []).includes(rule.refuse!) ? [`${op.name} lists ${rule.refuse} among its errors, so its handler could refuse it: the rule owns the refusal`] : []),
      ])),
    ...ownerProblems(e, f),
  ];
});

/** The refusal's class is a tagged error of its own name that carries the refusal's code, as a literal and as `static code`. */
const taggedProblems = (cls: string, refuse: string): ReadonlyArray<string> => [
  ...(new RegExp(`extends Schema\\.TaggedError<${refuse}>\\(\\)\\("${refuse}",`).test(cls) ? [] : [`${refuse} is not a tagged error of its own name`]),
  ...(cls.includes(`Schema.Literal(refusals.${refuse}.code)`) && cls.includes(`static readonly code = refusals.${refuse}.code`) ? [] : [`${refuse} does not carry its code as a literal and as a static code`]),
];

/** invariant.api: the refusal's class is generated, and each operation that breaks the rule lists it in its endpoint's errors, and no other operation does. */
export const api = over("invariant.api", (f, e) => {
  const refuse = f.rule.refuse;
  if (refuse === undefined) return [];
  const errors = e.files["generated/api/src/errors.ts"];
  const cls = errors === undefined ? undefined : Reading.classText(errors, refuse);
  const code = e.model.refusals[refuse];
  const row = errors === undefined ? undefined : Reading.objectRows(errors, "refusals")?.[refuse];
  return [
    ...(errors === undefined ? ["generated/api/src/errors.ts was not generated"] : cls === undefined ? [`errors.ts has no class ${refuse}`] : taggedProblems(cls, refuse)),
    ...(errors === undefined ? [] : code === undefined ? [`the model has no code for ${refuse}`] : row === undefined ? [`errors.ts's refusals table has no row for ${refuse}`] : row["code"] === code ? [] : [`the table says ${String(row["code"])} for ${refuse}, the model says ${code}`]),
    ...f.breakers.filter((op) => !Reading.hasName(listedErrors(endpointOf(e, op)), refuse)).map((op) => `${op.name}'s endpoint does not list ${refuse}`),
    ...Object.values(e.model.operations).filter((op) => !f.breakers.includes(op) && Reading.hasName(listedErrors(endpointOf(e, op)), refuse)).map((op) => `${op.name}'s endpoint lists ${refuse}, though the model says no rule can be broken by it`),
  ];
});

/** The unique indexes of a migration's SQL: name, table, columns and, when it has one, the states of its `WHERE "state" IN (…)`. */
const indexes = (sql: string) => [...sql.matchAll(/CREATE UNIQUE INDEX "([^"]+)" ON "([^"]+)" \(([^)]*)\)(?: WHERE "state" IN \(([^)]*)\))?\s*;/g)]
  .map((m) => ({
    name: m[1]!, table: m[2]!,
    // A column is a quoted name and nothing else: `owner`, `"name" COLLATE NOCASE` and `"name" DESC` are not the key the model says.
    columns: m[3]!.split(",").map((c) => c.trim()),
    states: m[4] === undefined ? undefined : [...m[4].matchAll(/'([^']*)'/g)].map((s) => s[1]!),
  }));
/** SQL as code: comments taken off (an index only in a comment is no index). */
const sqlCode = (sql: string) => sql.replace(/\/\*[^]*?\*\//g, "").replace(/--.*$/gm, "");

/** The `Handlers.serve({ name: "<op>", … })` statement of the server's `main.ts`, on one line or more, up to its closing `});`. */
const serveOf = (main: string, op: string) => {
  const at = main.search(new RegExp(`Handlers\\.serve\\(\\{[^}]*?name:\\s*"${op.replace(/[.]/g, "\\.")}"`));
  if (at < 0) return undefined;
  const end = main.indexOf("});", at);
  return main.slice(at, end < 0 ? undefined : end);
};
const mapOf = (serve: string) => Object.fromEntries([...(/invariants:\s*\{([^}]*)\}/.exec(serve)?.[1] ?? "").matchAll(/(\w+)\s*:\s*"([^"]+)"/g)].map((m) => [m[1]!, m[2]!]));

/**
 * invariant.server: D1 holds one unique index named for the rule over exactly its key columns, partial on exactly its states; the server mounts the thing's rules
 * and serves each breaker with the refusal mapped to this rule and no other operation with one; prove ran the operation's declared-errors check green and a journey step expects the refusal.
 */
export const server = over("invariant.server", (f, e) => {
  const sql = sqlCode(Object.entries(e.files).filter(([path]) => /^generated\/server\/migrations\/[^/]+\.sql$/.test(path)).map(([, text]) => text).join("\n"));
  const name = `${f.thing.name}_${f.local}`;
  const found = indexes(sql).filter((i) => i.name === name);
  const index = found[0];
  const main = e.files["generated/server/main.ts"] === undefined ? undefined : Reading.code(e.files["generated/server/main.ts"]!);
  const states = f.rule.while ?? [];
  const keyColumns = index?.columns.map((c) => /^"([^"]+)"$/.exec(c)?.[1]);
  return [
    ...(found.length === 0 ? [`the migrations have no unique index "${name}"`] : found.length > 1 ? [`the migrations have ${found.length} indexes named "${name}"`] : []),
    ...(new RegExp(`DROP\\s+INDEX\\s+(?:IF\\s+EXISTS\\s+)?"${name}"`, "i").test(sql) ? [`a migration drops the index "${name}"`] : []),
    ...(index === undefined ? [] : [
      ...(index.table === f.thing.name ? [] : [`index ${name} is on "${index.table}", not "${f.thing.name}"`]),
      ...(keyColumns!.every((c) => c !== undefined) && same(keyColumns as ReadonlyArray<string>, f.rule.fields) ? [] : [`index ${name} is over (${index.columns.join(", ")}), the rule's key is (${f.rule.fields.map((x) => `"${x}"`).join(", ")}), each a quoted column and nothing more`]),
      ...(states.length === 0 ? (index.states === undefined ? [] : [`index ${name} is partial (${index.states.join(", ")}), the rule holds in every state`])
        : index.states === undefined ? [`index ${name} holds in every state, the rule holds only while ${states.join(", ")}`]
        : same([...index.states].sort(), [...states].sort()) ? [] : [`index ${name} holds while ${index.states.join(", ")}, the rule while ${states.join(", ")}`]),
    ]),
    ...(main === undefined ? ["generated/server/main.ts was not generated"] : [
      ...(main.includes(`invariantsIn("${f.thing.name}",`) ? [] : [`the server does not mount ${f.thing.name}'s rules (invariantsIn("${f.thing.name}", …))`]),
      ...f.breakers.flatMap((op) => {
        const serve = serveOf(main, op.name);
        const map = serve === undefined ? undefined : mapOf(serve);
        return serve === undefined ? [`the server does not serve ${op.name}`] : map?.[f.rule.refuse!] === f.full ? [] : [`${op.name} is served with ${JSON.stringify(map ?? {})}, not ${f.rule.refuse} → ${f.full}`];
      }),
      ...Object.values(e.model.operations).filter((op) => !f.breakers.includes(op)).filter((op) => Object.values(mapOf(serveOf(main, op.name) ?? "")).includes(f.full)).map((op) => `${op.name} is served as breaking ${f.full}, though the model says it cannot`),
    ]),
    ...f.breakers.flatMap((op) => Reading.proved(e.prove, `${op.name} declared errors`)),
    ...(f.rule.refuse === undefined ? [] : refusedInAJourney(e, f.rule.refuse, f.breakers)),
  ];
});

/** A journey step expects the refusal and prove saw every such step pass: the server gave it. */
const refusedInAJourney = (e: ProjectEvidence, refuse: string, breakers: ReadonlyArray<{ readonly name: string }>): ReadonlyArray<string> => {
  if (e.prove === undefined) return ["no prove run was read"];
  const steps = Object.values(e.model.journeys ?? {}).flatMap((j) => j.steps.filter((s) => (s.checks ?? []).some((c) => c.kind === "refuses" && c.error === refuse)).map((s) => ({ journey: j.name, title: s.title, operation: s.call?.operation })));
  if (steps.length === 0) return [`no journey step expects ${refuse}, so the server was never seen to refuse for the rule`];
  return steps.flatMap(({ journey, title, operation }) => {
    const seen = e.prove?.journeys.find((j) => j.name === journey)?.steps.find((s) => s.name === title);
    return [
      ...(breakers.some((op) => op.name === operation) ? [] : [`the step "${title}" of "${journey}" expects ${refuse} from ${operation ?? "no call"}, which is no operation that can break the rule`]),
      ...(seen === undefined ? [`prove did not run the step "${title}" of "${journey}"`] : [
        ...(seen.verdict === "pass" ? [] : [`the step "${title}" of "${journey}" is ${seen.verdict}`]),
        ...(breakers.some((op) => op.name === seen.operation) ? [] : [`prove ran the step "${title}" of "${journey}" on ${seen.operation}, which is no operation that can break the rule`]),
      ]),
    ];
  });
};

/** invariant.sdk: the SDK exports the errors, the refusal is a tagged error with its code, and each operation that breaks the rule has it in its call's error channel. */
export const sdk = over("invariant.sdk", (f, e) => {
  const refuse = f.rule.refuse;
  if (refuse === undefined) return [];
  const cls = Reading.classText(e.files["generated/api/src/errors.ts"] ?? "", refuse);
  return [
    ...(Reading.exportedNames(e.files["generated/sdk/src/index.ts"] ?? "").some((n) => n.exported === "Errors") ? [] : ["the SDK does not export the errors"]),
    ...(cls === undefined ? [`errors.ts has no class ${refuse}`] : taggedProblems(cls, refuse)),
    ...f.breakers.filter((op) => !Reading.hasName(listedErrors(endpointOf(e, op)), refuse)).map((op) => `${op.name}'s call does not have ${refuse} in its error channel`),
    ...f.breakers.filter((op) => e.files[`generated/sdk/src/${op.thing}/${op.verb}.ts`] === undefined).map((op) => `the SDK has no call for ${op.name} (generated/sdk/src/${op.thing}/${op.verb}.ts)`),
  ];
});
