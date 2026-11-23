// What check 02 shares (M7.05): the plan `ortho env up test --plan --run <id>` prints, judged against the compiled model. It is check 37's judge for another environment, so everything about what a run's world is made of
// (the Worker, the databases, the namespaces, each derived from the model) comes from `e2e/m1/staging-plan.ts`'s `expected`, and only the environment and its short name differ. A pure judge (`problems`),
// so the same function runs on the real plan and on every planted wrong one. Written by the checks author; a builder never edits it.
import { type Plan, type PlanModel, type Resource, expected, owns, slug } from "../m1/staging-plan.ts";

export { expected, owns, slug };
export type { Plan, PlanModel, Resource };
/** The environment of a pull request's world, and the short form every resource name carries for it (the staging one is `stg`, `design/decisions/M7-cloud.md`, addendum). */
export const ENVIRONMENT = "test";
export const SHORT = "test";
export const prefixOf = (app: string, run: string) => `ortho-${slug(app)}-${SHORT}-${run}`;

const FIELDS: Record<string, ReadonlyArray<string>> = { worker: ["kind", "name"], d1: ["kind", "name", "binding"], "durable-object-namespace": ["kind", "script", "class"], r2: ["kind", "name"] };
const line = (r: Record<string, unknown>) => `${String(r["kind"])} ${String(r["name"] ?? `${String(r["script"])}:${String(r["class"])}`)}`;
const key = (r: unknown) => JSON.stringify(Object.entries(r as Record<string, unknown>).sort());

/** Everything wrong with `plan`: an empty list is a pass. `model`, `app` and `run` are what it is judged against, never read from the plan. */
export const problems = (plan: unknown, model: PlanModel, app: string, run: string): ReadonlyArray<string> => {
  const prefix = prefixOf(app, run);
  if (typeof plan !== "object" || plan === null || Array.isArray(plan)) return [`the plan is not one JSON object: ${JSON.stringify(plan)?.slice(0, 80)}`];
  const p = plan as Record<string, unknown>;
  const out: string[] = [];
  for (const [name, want] of [["app", app], ["environment", ENVIRONMENT], ["run", run], ["prefix", prefix]] as const) if (p[name] !== want) out.push(`${name} is ${JSON.stringify(p[name])}, expected ${JSON.stringify(want)}`);
  for (const extra of Object.keys(p).filter((k) => !["app", "environment", "run", "prefix", "resources"].includes(k))) out.push(`the plan has ${extra}, which a plan does not carry`);
  if (!Array.isArray(p["resources"])) return [...out, `resources is ${JSON.stringify(p["resources"])}, expected a list`];
  const kept: Array<Record<string, unknown>> = [];
  for (const [i, item] of (p["resources"] as ReadonlyArray<unknown>).entries()) {
    const r = item as Record<string, unknown>;
    const kind = typeof item === "object" && item !== null && !Array.isArray(item) ? r["kind"] : undefined;
    if (typeof kind !== "string" || !Object.hasOwn(FIELDS, kind)) { out.push(`resources[${i}] is not a resource of a known kind: ${JSON.stringify(item)?.slice(0, 80)}`); continue; }
    const fields = FIELDS[kind]!;
    const odd = Object.keys(r).filter((k) => !fields.includes(k));
    const absent = fields.filter((k) => typeof r[k] !== "string" || r[k] === "");
    if (odd.length > 0) out.push(`resources[${i}] has ${odd.join(", ")}, which a ${kind} does not carry`);
    if (absent.length > 0) out.push(`resources[${i}] (${kind}) lacks ${absent.join(", ")}`);
    const owner = kind === "durable-object-namespace" ? r["script"] : r["name"];
    if (typeof owner === "string" && !owns(prefix, owner)) out.push(`${line(r)} is not under the run's prefix ${prefix}`);
    if (odd.length === 0 && absent.length === 0) kept.push(r);
  }
  const want = expected(model, prefix).map((r) => r as unknown as Record<string, unknown>);
  for (const w of want) if (!kept.some((r) => key(r) === key(w))) out.push(`missing ${line(w)}`);
  for (const r of kept) if (!want.some((w) => key(r) === key(w))) out.push(`unexpected ${line(r)}: the model has nothing that needs it`);
  const seen = new Set<string>();
  for (const r of kept) { if (seen.has(key(r))) out.push(`${line(r)} is planned twice`); seen.add(key(r)); }
  return out;
};
