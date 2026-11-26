// Check 48 (Goal 18, slice 9, #1067: the chain basics in the alpha). Written by the author before the build; a builder never edits it (AGENTS.md, "Journeys and checks come first").
// What it states, in the words of design/goals/18-framework.md slice 9 and K44 section 2, call 4 ("the chain basics are in the alpha"):
//  (a) THE ON-CHAIN SUITE RUNS ON `main`. CI's `e2e-on-chain` job (.github/workflows/ci.yml) runs `nx run e2e:on-chain-ratchet`, the ratchet over e2e/on-chain (keys' and wallets' journeys
//      through money, the relayer and the follower), with Anvil and full history, on every ready pull request into `main` and on every push to `main`, as it does for `goal/on-chain`; a docs-only
//      run passes without its steps. The job's own `if` and its `env.SKIP` decide that, so they are read here and evaluated, for each event, with the small part of GitHub's expression language
//      the workflow uses (the evaluator is at the top of this file, and is tested against planted expressions). A step that must run and doesn't, or runs without Anvil, is as red as a job that skips.
//  (b) THE RELAYER IS MARKED EXPERIMENTAL, where a person meets it. The slice says "fixed or marked experimental" (#784); the author's call, on the evidence (the four bugs are in main today: a first
//      receipt is final in relayer/internal/check.ts, a fill is broadcast before it is stored, a resumed EIP-1559 transaction drops its access list in chain-evm's tx/internal/sign.ts; each needs
//      a reorg world, a restart between two writes, or a signed access list that no journey in the alpha has; no app pulls the relayer, K44 call 5) is: MARK IT, and keep #784 open for the app
//      that first pulls it. So: the relayer module's README opens with the word and #784's four limits (the fourth is in #784's first comment: a failed first arm leaves the row in flight), the class's own doc comment (what an editor shows on hover) carries `@experimental` and #784,
//      the canon's chains-and-wallets page says it where it lists what is built (and stops saying the relayer is "not written"), and the status page's row names it in its item. The marking is
//      judged by what a reader of each place sees, not by one string anywhere in the file (the judges are tested against planted wrong files below).
//  (c) NO LIVE PAGE STILL SAYS THE SUITE IS NOT RUN ON `main`: the climb's `NOT_RUN_ON_MAIN` is empty, its dashboard README says nothing of it, and e2e/on-chain's README says its job runs on `main`.
// Run on main for the first time (26 November 2026, Anvil 1.9, four cores, 11m 31s), the on-chain ratchet had four reds no list held, from two stale checks, not chain bugs. 02's baseline is the
// retired goal/stage-1: listed in e2e/on-chain/expected-failing/ under Snag #1096. 04-m6-10-values-refused's fixture named an id prefix no thing owns: the author fixed the fixture, and it is green.
// Two lines of 05's list pass now and are the builder's to remove. The job may skip a pull request that affected.sh says leaves the
// e2e project alone, so it need not be a bottleneck (Aaron, 26 November); every push to main runs it whole. Each red line here names a file a -build branch may edit.
// Some bans here are whole-file: TOPIC and ASCII in the relayer README and its doc comment, `hidden`, `<details>` and `~~` on the canon page, `on-chain` in the
// climb dashboard's README, "run on main" in climb.mjs. They hold while #784 is open; once it closes, its author narrows TOPIC to the paragraph beside each mark,
// or these turn m1 red on unrelated edits.
// The marking is the slice's only claim about #784. A builder who instead fixes the four bugs has to change this check's author first (they are the same slice: the author then pins each bug with
// a failing check, as #784's Fix says, and drops (b)); nothing here stops a fix.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { repo } from "./support.ts";

const read = (path: string) => readFileSync(join(repo, path), "utf8");

// ---- the part of GitHub's expression language ci.yml uses ----

type Value = string | number | boolean | null;
type Context = Readonly<Record<string, unknown>>;

const TOKEN = /\s*(?:('(?:[^']|'')*')|(\d+(?:\.\d+)?)|(&&|\|\||==|!=|!|\(|\)|,)|([A-Za-z_][\w.\-]*))/y;
const tokens = (src: string): ReadonlyArray<string> => {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  for (;;) {
    if (/^\s*$/.test(src.slice(TOKEN.lastIndex))) return out;
    const m = TOKEN.exec(src);
    if (m === null) throw new Error(`cannot read the expression at: ${src.slice(TOKEN.lastIndex)}`);
    out.push(m[1] ?? m[2] ?? m[3] ?? m[4] ?? "");
  }
};
const truthy = (v: Value) => !(v === false || v === 0 || v === "" || v === null || (typeof v === "number" && Number.isNaN(v)));
const num = (v: Value) => (v === null ? 0 : typeof v === "boolean" ? Number(v) : typeof v === "number" ? v : v.trim() === "" ? 0 : Number(v));
const same = (a: Value, b: Value) => (typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : typeof a === typeof b ? a === b : num(a) === num(b));
const lookup = (ctx: Context, path: string): Value => {
  let at: unknown = ctx;
  for (const key of path.split(".")) {
    if (typeof at !== "object" || at === null || !(key in at)) throw new Error(`this check's evaluator does not model the context ${path}, so it cannot say what GitHub would make of it`);
    at = (at as Record<string, unknown>)[key];
  }
  return typeof at === "string" || typeof at === "number" || typeof at === "boolean" ? at : null;
};
const FUNCTIONS: Readonly<Record<string, (args: ReadonlyArray<Value>) => Value>> = {
  contains: ([a, b]) => String(a ?? "").toLowerCase().includes(String(b ?? "").toLowerCase()),
  startsWith: ([a, b]) => String(a ?? "").toLowerCase().startsWith(String(b ?? "").toLowerCase()),
  endsWith: ([a, b]) => String(a ?? "").toLowerCase().endsWith(String(b ?? "").toLowerCase()),
  success: () => true, always: () => true, cancelled: () => false, failure: () => false,
};

/** One expression, evaluated against a context. Supports `!`, `&&`, `||`, `==`, `!=`, parentheses, string, number, `true`/`false`/`null` literals, contexts, and `contains`, `startsWith`, `endsWith`, `success`, `always`, `cancelled`, `failure`. */
export const evaluate = (src: string, ctx: Context): Value => {
  const t = tokens(src);
  let i = 0;
  const peek = () => t[i];
  const take = () => t[i++];
  const or = (): Value => { let v = and(); while (peek() === "||") { take(); const r = and(); v = truthy(v) ? v : r; } return v; };
  const and = (): Value => { let v = eq(); while (peek() === "&&") { take(); const r = eq(); v = truthy(v) ? r : v; } return v; };
  const eq = (): Value => {
    let v = unary();
    while (peek() === "==" || peek() === "!=") { const op = take(); const r = unary(); v = op === "==" ? same(v, r) : !same(v, r); }
    return v;
  };
  const unary = (): Value => (peek() === "!" ? (take(), !truthy(unary())) : primary());
  const primary = (): Value => {
    const tok = take();
    if (tok === undefined) throw new Error(`the expression ends too soon: ${src}`);
    if (tok === "(") { const v = or(); if (take() !== ")") throw new Error(`a ( is not closed: ${src}`); return v; }
    if (tok.startsWith("'")) return tok.slice(1, -1).replaceAll("''", "'");
    if (/^\d/.test(tok)) return Number(tok);
    if (tok === "true") return true;
    if (tok === "false") return false;
    if (tok === "null") return null;
    if (peek() === "(") {
      take();
      const args: Value[] = [];
      if (peek() !== ")") for (;;) { args.push(or()); if (peek() === ",") { take(); continue; } break; }
      if (take() !== ")") throw new Error(`a call is not closed: ${src}`);
      const fn = FUNCTIONS[tok];
      if (fn === undefined) throw new Error(`this check's evaluator does not know the function ${tok}(): ${src}`);
      return fn(args);
    }
    return lookup(ctx, tok);
  };
  const v = or();
  if (i !== t.length) throw new Error(`the expression has more after its end: ${src}`);
  return v;
};

const text = (v: Value) => (v === null ? "" : String(v));
/** A workflow field: `${{ expr }}` spliced into the text around it. */
export const template = (field: unknown, ctx: Context): string =>
  String(field).replace(/\$\{\{([\s\S]*?)\}\}/g, (_, expr: string) => text(evaluate(expr, ctx)));
/** An `if:` field: the expression, with or without its `${{ }}`. */
export const condition = (field: unknown, ctx: Context): boolean => {
  if (field === undefined) return true;
  if (typeof field === "boolean") return field;
  const s = String(field).trim();
  const whole = /^\$\{\{([\s\S]*)\}\}$/.exec(s);
  return truthy(evaluate(whole === null ? s : whole[1] ?? "", ctx));
};

// ---- (a) the job, read from the workflow, for each event ----

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- a parsed workflow
/** Every output of the `changes` job (ci.yml), each read by name. */
export const OUTPUTS = ["docs_only", "fast", "affected_e2e", "affected_prove"] as const;
export type Outputs = Readonly<Record<(typeof OUTPUTS)[number], "true" | "false">>;
export interface Event { readonly name: string; readonly event: "pull_request" | "push"; readonly base?: string; readonly ref?: string }
export interface Scenario extends Event { readonly result: "success" | "failure"; readonly outputs: Outputs }

const JOB = "e2e-on-chain";
const RATCHET = "e2e:on-chain-ratchet";

/** The steps of the on-chain job that run for one event, in order, each with the env it would see; `undefined` when the job itself does not run. */
export const stepsThatRun = (workflow: Json, s: Scenario): ReadonlyArray<Json> | undefined => {
  const job: Json | undefined = workflow.jobs?.[JOB];
  if (job === undefined) return undefined;
  const base: Record<string, unknown> = {
    github: { event_name: s.event, base_ref: s.base ?? "", ref: s.ref ?? "", head_ref: s.event === "pull_request" ? "some/branch" : "" },
    needs: {
      ready: { result: "success", outputs: { draft: "false" } },
      changes: { result: s.result, outputs: { ...s.outputs } },
    },
    env: {},
  };
  const withEnv = (...envs: ReadonlyArray<Json | undefined>): Context => {
    const env: Record<string, string> = {};
    for (const e of envs) for (const [k, v] of Object.entries(e ?? {})) env[k] = template(v, { ...base, env });
    return { ...base, env };
  };
  if (!condition(job.if, base)) return undefined;
  const jobCtx = withEnv(workflow.env, job.env);
  return (job.steps as ReadonlyArray<Json>).filter((step) => condition(step.if, jobCtx)).map((step) => ({ ...step, resolvedEnv: withEnv(workflow.env, job.env, step.env).env }));
};

/** What the job must do for a run that is not docs-only: the whole history, pnpm, Anvil (pinned) and the ratchet with Anvil switched on. Problems, one line each. */
export const problemsOf = (steps: ReadonlyArray<Json> | undefined): ReadonlyArray<string> => {
  if (steps === undefined) return ["the job does not run"];
  const problems: string[] = [];
  const uses = (name: string) => steps.find((step) => typeof step.uses === "string" && step.uses.startsWith(`${name}@`));
  const ratchet = steps.find((step) => typeof step.run === "string" && step.run.includes(RATCHET));
  if (ratchet === undefined) problems.push(`no step that runs ${RATCHET} runs`);
  else if ((ratchet.resolvedEnv as Json).ORTHO_CHAIN_EVM_ANVIL !== "1") problems.push(`the step that runs ${RATCHET} does not have ORTHO_CHAIN_EVM_ANVIL=1`);
  const checkout = uses("actions/checkout");
  if (checkout === undefined) problems.push("no checkout runs");
  else if (String(checkout.with?.["fetch-depth"]) !== "0") problems.push("the checkout does not take the whole history (fetch-depth 0)");
  if (uses("foundry-rs/foundry-toolchain") === undefined) problems.push("Anvil is not installed (foundry-rs/foundry-toolchain does not run)");
  else if (!/^v\d+\.\d+\.\d+$/.test(String(uses("foundry-rs/foundry-toolchain")?.with?.version))) problems.push("Foundry is not pinned to an exact version");
  if (!steps.some((step) => typeof step.run === "string" && /pnpm install/.test(step.run))) problems.push("pnpm install does not run");
  const order = (needle: (s: Json) => boolean) => steps.findIndex(needle);
  if (ratchet !== undefined && order((s) => s === ratchet) < order((s) => typeof s.run === "string" && /pnpm install/.test(s.run))) problems.push("the ratchet runs before pnpm install");
  return problems;
};

const EVENTS = {
  prMain: { name: "a pull request into main", event: "pull_request", base: "main" },
  pushMain: { name: "a push to main", event: "push", ref: "refs/heads/main" },
  prGoal: { name: "a pull request into goal/on-chain", event: "pull_request", base: "goal/on-chain" },
  pushGoal: { name: "a push to goal/on-chain", event: "push", ref: "refs/heads/goal/on-chain" },
} as const satisfies Record<string, Event>;

/** What `changes` can answer. On a push its steps set docs_only false and leave affected_e2e and affected_prove at their 'true' default, and fast is scope.sh's; on a pull request, every output either way. Either event, the job may also have failed. */
export const answers = (event: Event["event"]): ReadonlyArray<Pick<Scenario, "result" | "outputs">> => {
  const out: Array<Pick<Scenario, "result" | "outputs">> = [];
  for (const result of ["success", "failure"] as const)
    for (let bits = 0; bits < 2 ** OUTPUTS.length; bits++) {
      const outputs = Object.fromEntries(OUTPUTS.map((k, i) => [k, (bits >> i) & 1 ? "true" : "false"])) as Outputs;
      if (event === "push" && (outputs.docs_only !== "false" || outputs.affected_e2e !== "true" || outputs.affected_prove !== "true")) continue;
      out.push({ result, outputs });
    }
  return out;
};
/** Must the ratchet run? On every push, yes. On a pull request: not when `changes` succeeded and said docs-only (it passes without its steps); either way when it succeeded and said the e2e project, which holds the on-chain suite, is not affected (affected.sh's `affected_e2e`); otherwise yes, a failed `changes` included. */
export const rule = (event: Event["event"], a: Pick<Scenario, "result" | "outputs">): "run" | "not" | "either" => {
  if (event === "push" || a.result !== "success") return "run";
  if (a.outputs.docs_only === "true") return "not";
  if (a.outputs.affected_e2e === "false") return "either";
  return "run";
};
const said = (a: Pick<Scenario, "result" | "outputs">) => `changes ${a.result}, ${OUTPUTS.map((k) => `${k}=${a.outputs[k]}`).join(" ")}`;

const RATCHET_RUN = "pnpm nx run e2e:on-chain-ratchet --outputStyle=static";
const keysOf = (o: unknown) => (typeof o === "object" && o !== null ? Object.keys(o) : []);
const extra = (o: unknown, allowed: ReadonlyArray<string>) => keysOf(o).filter((k) => !allowed.includes(k));
const bare = (field: unknown) => { const t = String(field).trim(); const m = /^\$\{\{([\s\S]*)\}\}$/.exec(t); return (m === null ? t : m[1] ?? "").trim(); };
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The job's shape, whatever the event: nothing GitHub reads that the evaluator does not (a shell, `continue-on-error`, `defaults`, a runner, a ref, a trigger filter), and the ratchet step exactly. */
export const shapeProblems = (workflow: Json): ReadonlyArray<string> => {
  const out: string[] = [];
  if (workflow.defaults !== undefined) out.push("the workflow sets `defaults`, which can change how every run step runs");
  for (const k of extra(workflow.on?.push, ["branches"])) out.push(`the push trigger has \`${k}\`, which can keep a push to main from running it`);
  for (const k of extra(workflow.on?.pull_request, ["types"])) out.push(`the pull_request trigger has \`${k}\`, which can keep a pull request into main from running it`);
  const job: Json | undefined = workflow.jobs?.[JOB];
  if (job === undefined) return out;
  for (const k of extra(job, ["name", "needs", "if", "runs-on", "timeout-minutes", "env", "steps"])) out.push(`the job has \`${k}\`, which this check does not allow`);
  if (job["runs-on"] !== "ubuntu-latest") out.push(`the job runs on ${JSON.stringify(job["runs-on"])}, not ubuntu-latest`);
  for (const k of extra(job.env, ["SKIP"])) out.push(`the job's env sets ${k}`);
  const steps: ReadonlyArray<Json> = Array.isArray(job.steps) ? job.steps : [];
  steps.forEach((step, n) => {
    const what = `step ${n + 1} (${step.uses ?? String(step.run ?? "").split("\n")[0]})`;
    for (const k of extra(step, ["if", "uses", "with", "run", "env", "name"])) out.push(`${what} has \`${k}\`, which this check does not allow`);
    const cond = bare(step.if);
    if (cond !== "env.SKIP != 'true'" && cond !== "env.SKIP == 'true'") out.push(`${what}'s if is \`${cond}\`, not env.SKIP != 'true' (or == 'true' for the docs-only note)`);
    if (cond === "env.SKIP == 'true'" && !(step.uses === undefined && /^echo /.test(String(step.run ?? "")))) out.push(`${what} runs when the job skips, and is not an echo`);
    if (typeof step.run === "string" && /GITHUB_ENV|GITHUB_PATH/.test(step.run)) out.push(`${what} writes GITHUB_ENV or GITHUB_PATH, which can change what the ratchet sees`);
    if (typeof step.uses === "string" && step.uses.startsWith("actions/checkout@") && !sameJson(step.with, { "fetch-depth": 0 })) out.push(`${what}'s with is ${JSON.stringify(step.with)}, not exactly the whole history of the commit under test ({"fetch-depth":0})`);
    if (typeof step.uses === "string" && step.uses.startsWith("foundry-rs/foundry-toolchain@") && !sameJson(keysOf(step.with), ["version"])) out.push(`${what}'s with is ${JSON.stringify(step.with)}, not only a version`);
  });
  const ratchets = steps.filter((step) => typeof step.run === "string" && step.run.includes("on-chain-ratchet"));
  if (ratchets.length !== 1) out.push(`${ratchets.length} steps name the ratchet, not one`);
  for (const r of ratchets) {
    if (String(r.run).trim() !== RATCHET_RUN) out.push(`the ratchet step runs \`${String(r.run).trim()}\`, not exactly \`${RATCHET_RUN}\``);
    if (!sameJson(r.env, { ORTHO_CHAIN_EVM_ANVIL: "1" })) out.push(`the ratchet step's env is ${JSON.stringify(r.env)}, not exactly {"ORTHO_CHAIN_EVM_ANVIL":"1"}`);
  }
  return out;
};

/** The verdict on a workflow: for each event, each answer `changes` can give, what must happen. One line per way it is wrong (with the first case it is wrong in); an expression the evaluator cannot read is one too. */
export const workflowProblems = (workflow: Json): ReadonlyArray<string> => {
  const found = new Map<string, string[]>();
  const add = (key: string, when: string) => found.set(key, [...(found.get(key) ?? []), when]);
  for (const ev of Object.values(EVENTS) as ReadonlyArray<Event>)
    for (const a of answers(ev.event)) {
      const must = rule(ev.event, a);
      if (must === "either") continue;
      {
        const when = said(a);
        try {
          const steps = stepsThatRun(workflow, { ...ev, ...a });
          if (must === "run") for (const p of problemsOf(steps)) add(`${ev.name}: ${p}`, when);
          else if (steps?.some((step) => typeof step.run === "string" && step.run.includes(RATCHET))) add(`${ev.name}: the ratchet runs on a docs-only run, which passes without its steps`, when);
        } catch (e) { add(`${ev.name}: ${(e as Error).message}`, when); }
      }
    }
  const out: string[] = [...shapeProblems(workflow)];
  for (const [key, whens] of found) out.push(`${key} (${whens.length === 1 ? `when ${whens[0]}` : `in ${whens.length} cases, first when ${whens[0]}`})`);
  const branches: unknown = workflow.on?.push?.branches;
  if (!Array.isArray(branches) || !branches.includes("main")) out.push("the workflow does not run on a push to main");
  if (workflow.on?.pull_request === undefined) out.push("the workflow does not run on pull requests");
  return out;
};

const ci = (): Json => parse(read(".github/workflows/ci.yml")) as Json;
const project = (): Json => JSON.parse(read("e2e/project.json")) as Json;

// The evaluator above judges what the job's own conditions mean. Two hostile passes showed it can't judge what the job trusts (the jobs that feed it, the
// nx target it names, the triggers, every other step's script), so the job and those parts are also held to approved shapes, word for word:
// e2e/m1/48-g18-9-chain-basics.approved.json, which holds today's job without its env, the `ready` step's script, the whole `changes` job (its outputs and the steps that compute them), the
// pull request trigger's types and the nx target. SKIP is one of two approved expressions; the evaluator, on planted copies below, shows each means
// what the rule says. Sharding is not offered here: a matrix on this required job would rename its check, and the target cannot pass vitest a shard
// (nx adds the flag to every command, so `rm` gets it). The e2e-m1 shape (a shard job, a gate, the reports merged) is its own slice, and that slice's author
// owns approved.json and rewrites it. The scripts the `changes` steps call (tools/ci/docs-only.sh, scope.sh, affected.sh) are judged by tools/ci/ci.test.sh, not here.
const APPROVED = JSON.parse(read("e2e/m1/48-g18-9-chain-basics.approved.json")) as { job: Json; readyRun: string; changesJob: Json; prTypes: ReadonlyArray<string>; target: Json };
export const SKIP_RUN =
  "!((github.event_name == 'pull_request' && (github.base_ref == 'main' || github.base_ref == 'goal/on-chain')) || github.ref == 'refs/heads/main' || github.ref == 'refs/heads/goal/on-chain') || (needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true')";
export const SKIP_GATED = `${SKIP_RUN} || (github.event_name == 'pull_request' && needs.changes.result == 'success' && needs.changes.outputs.affected_e2e == 'false')`;
export const SKIPS = [`\${{ ${SKIP_RUN} }}`, `\${{ ${SKIP_GATED} }}`];
const canon = (v: unknown): string => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : typeof v === "object" && v !== null ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Json)[k])}`).join(",")}}` : JSON.stringify(v));
const differs = (a: Json | undefined, b: Json) => [...new Set([...keysOf(a), ...keysOf(b)])].filter((k) => canon(a?.[k]) !== canon(b[k]));

/** The job, word for word, and what it trusts. One line per part that is not the approved one. */
export const exactProblems = (workflow: Json, proj: Json): ReadonlyArray<string> => {
  const out: string[] = [];
  const job: Json | undefined = workflow.jobs?.[JOB];
  if (job === undefined) return ["the workflow has no job e2e-on-chain"];
  const { env, ...rest } = job;
  const off = differs(rest, APPROVED.job);
  if (off.length > 0) out.push(`the job e2e-on-chain is not the approved job: its ${off.join(", ")} differ (e2e/m1/48-g18-9-chain-basics.approved.json)`);
  if (canon(keysOf(env)) !== canon(["SKIP"]) || !SKIPS.includes(String(env?.SKIP))) out.push("the job's env is not exactly SKIP, set to one of the two approved expressions (SKIPS in this check)");
  for (const [k, v] of Object.entries((workflow.jobs ?? {}) as Json)) if (k !== JOB && (k.includes("on-chain") || String((v as Json)?.name ?? "").includes("on-chain"))) out.push(`another job, ${k}, is named for the on-chain suite`);
  for (const k of extra(workflow, ["name", "on", "permissions", "concurrency", "jobs"])) out.push(`the workflow has \`${k}\` at its top`);
  for (const k of extra(workflow.on, ["push", "pull_request"])) out.push(`the workflow runs on \`${k}\` too`);
  const branches: ReadonlyArray<unknown> = Array.isArray(workflow.on?.push?.branches) ? workflow.on.push.branches : [];
  if (!branches.includes("main") || branches.some((b) => String(b).startsWith("!"))) out.push(`the push trigger's branches are ${JSON.stringify(branches)}: main, and no pattern that takes a branch out`);
  if (canon(workflow.on?.pull_request) !== canon({ types: APPROVED.prTypes })) out.push(`the pull request trigger is ${JSON.stringify(workflow.on?.pull_request)}, not ${JSON.stringify({ types: APPROVED.prTypes })}`);
  const ready = workflow.jobs?.ready;
  if (canon(ready?.outputs) !== canon({ draft: "${{ steps.live.outputs.draft }}" }) || ready?.steps?.[0]?.id !== "live" || ready?.steps?.[0]?.run !== APPROVED.readyRun) out.push("the ready job, which says whether a run is a draft, is not the approved one");
  const changesOff = differs(workflow.jobs?.changes, APPROVED.changesJob);
  if (changesOff.length > 0) out.push(`the changes job, whose outputs decide a skip, is not the approved one: its ${changesOff.join(", ")} differ (its steps compute docs_only and affected_e2e)`);
  if (canon(proj.targets?.["on-chain-ratchet"]) !== canon(APPROVED.target)) out.push("e2e/project.json's target on-chain-ratchet is not the approved one");
  return out;
};

// A workflow, written small, to plant wrong jobs in. `skip` is the job's env.SKIP expression; `rest` replaces the other steps' fields.
const guard = (skip: string) => `\${{ ${skip} }}`;
const GOOD_SKIP = "!(github.ref == 'refs/heads/main' || (github.event_name == 'pull_request' && (github.base_ref == 'main' || github.base_ref == 'goal/on-chain')) || github.ref == 'refs/heads/goal/on-chain') || (needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true')";
const small = (skip: string, edit: (steps: Json[]) => Json[] = (s) => s, ifExpr = "${{ needs.ready.outputs.draft == 'false' && !cancelled() }}"): Json => ({
  on: { push: { branches: ["main"] }, pull_request: { types: ["opened"] } },
  jobs: {
    [JOB]: {
      if: ifExpr,
      "runs-on": "ubuntu-latest",
      env: { SKIP: guard(skip) },
      steps: edit([
        { if: "env.SKIP == 'true'", run: "echo pass" },
        { if: "env.SKIP != 'true'", uses: "actions/checkout@v7.0.1", with: { "fetch-depth": 0 } },
        { if: "env.SKIP != 'true'", uses: "pnpm/action-setup@v6.1.0" },
        { if: "env.SKIP != 'true'", run: "pnpm install --frozen-lockfile" },
        { if: "env.SKIP != 'true'", uses: "foundry-rs/foundry-toolchain@v1.9.2", with: { version: "v1.8.6" } },
        { if: "env.SKIP != 'true'", run: "pnpm nx run e2e:on-chain-ratchet --outputStyle=static", env: { ORTHO_CHAIN_EVM_ANVIL: "1" } },
      ]),
    },
  },
});
const without = (needle: RegExp) => (steps: Json[]) => steps.filter((s) => !needle.test(`${s.uses ?? ""} ${s.run ?? ""}`));
const patch = (needle: RegExp, fields: Json) => (steps: Json[]) => steps.map((s) => (needle.test(`${s.uses ?? ""} ${s.run ?? ""}`) ? { ...s, ...fields } : s));

describe("the evaluator reads what the workflow means (its own controls)", () => {
  const ctx = { github: { event_name: "pull_request", base_ref: "main", ref: "refs/pull/1/merge" }, needs: { changes: { result: "success", outputs: { docs_only: "false" } } }, env: { SKIP: "false" } };
  it("takes the workflow's own wording the same as GitHub does", () => {
    expect(evaluate("github.base_ref == 'main'", ctx)).toBe(true);
    expect(evaluate("github.base_ref == 'MAIN'", ctx)).toBe(true);
    expect(evaluate("github.base_ref != 'main'", ctx)).toBe(false);
    expect(evaluate("!(github.base_ref == 'main')", ctx)).toBe(false);
    expect(evaluate("github.ref == 'refs/heads/main' || github.base_ref == 'main'", ctx)).toBe(true);
    expect(evaluate("github.ref == 'refs/heads/main' && github.base_ref == 'main'", ctx)).toBe(false);
    expect(evaluate("(needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true')", ctx)).toBe(false);
    expect(evaluate("startsWith(github.base_ref, 'ma') && !cancelled()", ctx)).toBe(true);
    expect(evaluate("contains('a,b', 'c')", ctx)).toBe(false);
    expect(evaluate("'it''s' == 'IT''S'", ctx)).toBe(true);
    expect(template("${{ github.base_ref == 'main' }}", ctx)).toBe("true");
    expect(template("x-${{ github.base_ref }}-y", ctx)).toBe("x-main-y");
    expect(condition("env.SKIP != 'true'", ctx)).toBe(true);
    expect(condition("${{ env.SKIP == 'true' }}", ctx)).toBe(false);
    expect(condition(undefined, ctx)).toBe(true);
  });
  it("refuses what it cannot read, loudly, never as a pass", () => {
    expect(() => evaluate("github.base_ref === 'main'", ctx)).toThrow();
    expect(() => evaluate("fromJSON('1')", ctx)).toThrow(/does not know/);
    expect(() => evaluate("needs.nothing.outputs.here == 'x'", ctx)).toThrow(/does not model/);
    expect(() => evaluate("!github.repository", ctx)).toThrow(/does not model/);
    expect(() => evaluate("(github.base_ref == 'main'", ctx)).toThrow();
    expect(() => evaluate("github.base_ref == 'main' )", ctx)).toThrow();
  });
});

describe("(a) the on-chain suite runs on main: the job `e2e-on-chain` in .github/workflows/ci.yml", () => {
  const all = [...exactProblems(ci(), project()), ...workflowProblems(ci())];
  const shape = [...shapeProblems(ci()), ...exactProblems(ci(), project())];
  const about = (prefix: string) => [...shape, ...all.filter((p) => p.startsWith(prefix))];
  const evaluated = (prefix: string) => [...shapeProblems(ci()), ...workflowProblems(ci()).filter((p) => p.startsWith(prefix))];
  it("runs the ratchet, with Anvil and the whole history, on a pull request into main", () => {
    expect(about(`${EVENTS.prMain.name}:`), "the job's steps for a pull request into main").toEqual([]);
  });
  it("runs it on a push to main", () => {
    expect(about(`${EVENTS.pushMain.name}:`), "the job's steps for a push to main").toEqual([]);
  });
  it("still runs it for the goal's own branch (a pull request into goal/on-chain, a push to it)", () => {
    expect(evaluated(`${EVENTS.prGoal.name}:`), "pull request into goal/on-chain").toEqual([]);
    expect(evaluated(`${EVENTS.pushGoal.name}:`), "push to goal/on-chain").toEqual([]);
  });
  it("passes without its steps on a docs-only run, for main and for goal/on-chain", () => {
    expect(all.filter((p) => p.includes("on a docs-only run"))).toEqual([]);
  });
  it("is run by a workflow that runs on a push to main and on pull requests", () => {
    expect(all.filter((p) => p.startsWith("the workflow"))).toEqual([]);
  });
  it("has the whole verdict empty: no event, no step, no condition is wrong", () => {
    expect(all).toEqual([]);
  });
});

describe("(a) the exact judge is fair: today's workflow with an approved SKIP, and each wrong part (planted copies)", () => {
  const planted = (skip: string, edit: (w: Json, p: Json) => void = () => {}): readonly [Json, Json] => {
    const w = ci();
    const p = project();
    w.jobs[JOB].env = { SKIP: skip };
    edit(w, p);
    return [w, p] as const;
  };
  it.each(SKIPS)("passes today's workflow with SKIP %s, and the evaluator agrees it does what the rule says", (skip) => {
    const [w, p] = planted(skip);
    expect([...exactProblems(w, p), ...workflowProblems(w)]).toEqual([]);
  });
  const step = (w: Json, needle: RegExp): Json => (w.jobs[JOB].steps as Json[]).find((x) => needle.test(`${x.uses ?? ""} ${x.run ?? ""} ${x.name ?? ""}`)) as Json;
  it.each([
    ["a01 SKIP that also skips goal- branches", (w: Json) => { w.jobs[JOB].env.SKIP = SKIPS[0]?.replace(" }}", " || startsWith(github.head_ref, 'goal-') }}"); }],
    ["a02 SKIP that skips every pull request on GitHub", (w: Json) => { w.jobs[JOB].env.SKIP = SKIPS[0]?.replace(" }}", " || (github.event_name == 'pull_request' && github.ref != '') }}"); }],
    ["a03 the job's if without !cancelled()", (w: Json) => { w.jobs[JOB].if = "${{ needs.ready.outputs.draft == 'false' }}"; }],
    ["a04 the job's if with success()", (w: Json) => { w.jobs[JOB].if = "${{ needs.ready.outputs.draft == 'false' && success() }}"; }],
    ["a05 the nx target neutered", (_: Json, p: Json) => { p.targets["on-chain-ratchet"].options.commands = ["echo skipped; exit 0"]; }],
    ["a06 a step that replaces pnpm", (w: Json) => { const s = step(w, /docker/); s.run = `${s.run}\nsudo ln -sf /bin/true "$(command -v pnpm)"`; }],
    ["a07 a step that deletes the suite", (w: Json) => { step(w, /anvil --version/).run = "anvil --version && rm -rf e2e/on-chain/*.test.ts"; }],
    ["a08 a second checkout, of another branch, in other case", (w: Json) => { (w.jobs[JOB].steps as Json[]).push({ if: "env.SKIP != 'true'", uses: "Actions/checkout@v7.0.1", with: { "fetch-depth": 0, ref: "goal/stage-1" } }); }],
    ["a24 a second Foundry, in other case, on nightly", (w: Json) => { (w.jobs[JOB].steps as Json[]).push({ if: "env.SKIP != 'true'", uses: "Foundry-rs/foundry-toolchain@v1.9.2", with: { version: "nightly-2020" } }); }],
    ["a09 pull requests only when closed", (w: Json) => { w.on.pull_request.types = ["closed"]; }],
    ["a10 push branches with !main", (w: Json) => { w.on.push.branches = [...w.on.push.branches, "!main"]; }],
    ["a11 changes forcing affected_e2e false on pull requests", (w: Json) => { w.jobs.changes.outputs.affected_e2e = "${{ github.event_name == 'pull_request' && 'false' || 'true' }}"; }],
    ["a21 ready saying draft on a push", (w: Json) => { w.jobs.ready.steps[0].run = String(w.jobs.ready.steps[0].run).replace("else\n  draft=false", "else\n  draft=true"); }],
    ["a12 the job renamed, a gate in its name that only echoes", (w: Json) => { w.jobs["e2e-on-chain-real"] = w.jobs[JOB]; w.jobs[JOB] = { name: "e2e-on-chain", "runs-on": "ubuntu-latest", steps: [{ run: "echo ok" }] }; }],
    ["a23 a workflow env", (w: Json) => { w.env = { NODE_OPTIONS: "--require=/dev/null/x" }; }],
    ["a13 a timeout of a minute", (w: Json) => { w.jobs[JOB]["timeout-minutes"] = 1; }],
    ["a matrix on the job", (w: Json) => { w.jobs[JOB].strategy = { matrix: { shard: [1, 2, 3] } }; }],
    ["the ratchet with || true", (w: Json) => { step(w, /e2e:on-chain-ratchet/).run = "pnpm nx run e2e:on-chain-ratchet --outputStyle=static || true"; }],
    ["Anvil off on the ratchet step", (w: Json) => { step(w, /e2e:on-chain-ratchet/).env = { ORTHO_CHAIN_EVM_ANVIL: "0" }; }],
    ["W1 the aff step says affected_e2e=false", (w: Json) => { ((w.jobs.changes.steps as Json[]).find((x) => x.id === "aff") as Json).run = 'echo affected_e2e=false >> "$GITHUB_OUTPUT"'; }],
    ["W2 the diff step says docs_only=true", (w: Json) => { const d = (w.jobs.changes.steps as Json[]).find((x) => x.id === "diff") as Json; d.run = 'echo docs_only=true >> "$GITHUB_OUTPUT"'; }],
    ["the aff step's if made to always run", (w: Json) => { ((w.jobs.changes.steps as Json[]).find((x) => x.id === "aff") as Json).if = "true"; }],
    ["a SKIP gated on affected_prove", (w: Json) => { w.jobs[JOB].env.SKIP = SKIPS[1]?.replace("affected_e2e", "affected_prove"); }],
  ] as const)("catches %s", (_, edit) => {
    const [w, p] = planted(SKIPS[0] ?? "", edit as (w: Json, p: Json) => void);
    expect([...exactProblems(w, p), ...workflowProblems(w)].length).toBeGreaterThan(0);
  });
});

describe("(a) the judge is fair: what it passes and what it catches (planted workflows)", () => {
  it("passes a small workflow that does it right (the throwaway implementation)", () => {
    expect(workflowProblems(small(GOOD_SKIP))).toEqual([]);
  });
  const caught = (name: string, wf: Json, expected: RegExp) => it(`catches ${name}`, () => {
    const found = workflowProblems(wf);
    expect(found.length, `no problem was found for ${name}`).toBeGreaterThan(0);
    expect(found.join("\n")).toMatch(expected);
  });
  caught("a job that runs only for goal/on-chain (today's wording)", small("!((github.event_name == 'pull_request' && github.base_ref == 'goal/on-chain') || github.ref == 'refs/heads/goal/on-chain') || (needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true')"), /pull request into main: the job does not\b|pull request into main: no step/);
  caught("a job that runs on a pull request into main but not on a push to it", small("!((github.event_name == 'pull_request' && (github.base_ref == 'main' || github.base_ref == 'goal/on-chain')) || github.ref == 'refs/heads/goal/on-chain') || (needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true')"), /a push to main: /);
  caught("a job that runs on a push to main but not on a pull request into it", small("!(github.ref == 'refs/heads/main' || (github.event_name == 'pull_request' && github.base_ref == 'goal/on-chain') || github.ref == 'refs/heads/goal/on-chain') || (needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true')"), /a pull request into main: /);
  caught("a job that gave up goal/on-chain for main", small("!(github.ref == 'refs/heads/main' || (github.event_name == 'pull_request' && github.base_ref == 'main')) || (needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true')"), /goal\/on-chain: /);
  caught("a job that never skips (a docs-only run runs the ratchet)", small("false"), /the ratchet runs on a docs-only run/);
  caught("a job that always skips", small("true"), /a pull request into main: the job does not|a pull request into main: no step/);
  caught("a job that skips docs-only on main but runs the ratchet on a docs-only pull request into goal/on-chain", small("!(github.ref == 'refs/heads/main' || (github.event_name == 'pull_request' && (github.base_ref == 'main' || github.base_ref == 'goal/on-chain')) || github.ref == 'refs/heads/goal/on-chain') || (needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true' && github.base_ref == 'main')"), /a pull request into goal\/on-chain: the ratchet runs on a docs-only run/);
  caught("a job whose own `if` is for goal/on-chain only", small(GOOD_SKIP, (s) => s, "${{ needs.ready.outputs.draft == 'false' && !cancelled() && github.base_ref == 'goal/on-chain' }}"), /pull request into main: the job does not run/);
  caught("a ratchet step that Anvil is not switched on for", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { env: {} })), /ORTHO_CHAIN_EVM_ANVIL=1/);
  caught("a ratchet step that sets Anvil to 0", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { env: { ORTHO_CHAIN_EVM_ANVIL: "0" } })), /ORTHO_CHAIN_EVM_ANVIL=1/);
  caught("a job without the ratchet step", small(GOOD_SKIP, without(/e2e:on-chain-ratchet/)), /no step that runs e2e:on-chain-ratchet runs/);
  caught("a ratchet step that skips on main", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { if: "env.SKIP != 'true' && github.ref != 'refs/heads/main' && github.base_ref != 'main'" })), /no step that runs e2e:on-chain-ratchet runs/);
  caught("a job without Anvil", small(GOOD_SKIP, without(/foundry-toolchain/)), /Anvil is not installed/);
  caught("a job with Anvil unpinned", small(GOOD_SKIP, patch(/foundry-toolchain/, { with: { version: "nightly" } })), /not pinned/);
  caught("a checkout with a shallow history", small(GOOD_SKIP, patch(/actions\/checkout/, { with: {} })), /whole history/);
  caught("a checkout with a depth of 1", small(GOOD_SKIP, patch(/actions\/checkout/, { with: { "fetch-depth": 1 } })), /whole history/);
  caught("a job without pnpm install", small(GOOD_SKIP, without(/pnpm install/)), /pnpm install does not run/);
  caught("a job that runs the ratchet before it installs", small(GOOD_SKIP, (s) => [...s.slice(0, 3), s[5] as Json, ...s.slice(3, 5)]), /before pnpm install/);
  caught("a workflow that does not run on a push to main", { ...small(GOOD_SKIP), on: { push: { branches: ["goal/on-chain"] }, pull_request: {} } }, /does not run on a push to main/);
  caught("a workflow with no pull requests", { ...small(GOOD_SKIP), on: { push: { branches: ["main"] } } }, /does not run on pull requests/);
  caught("a workflow with no such job", { on: { push: { branches: ["main"] }, pull_request: {} }, jobs: {} }, /the job does not run/);
  // The hostile pass (26 November 2026): each wrong workflow below passed the first judge, and is planted here.
  const ratchetRun = (run: string) => patch(/e2e:on-chain-ratchet/, { run });
  caught("A01 a ratchet run with `|| true`", small(GOOD_SKIP, ratchetRun("pnpm nx run e2e:on-chain-ratchet --outputStyle=static || true")), /not exactly/);
  caught("A02 a ratchet step with continue-on-error", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { "continue-on-error": true })), /continue-on-error/);
  caught("A03 a ratchet step with a shell that runs nothing", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { shell: "true {0}" })), /`shell`/);
  caught("A04 a job with defaults.run.shell", { ...small(GOOD_SKIP), jobs: { [JOB]: { ...small(GOOD_SKIP).jobs[JOB], defaults: { run: { shell: "true {0}" } } } } }, /`defaults`/);
  caught("A04b a workflow with defaults", { ...small(GOOD_SKIP), defaults: { run: { shell: "true {0}" } } }, /sets `defaults`/);
  caught("A05 Anvil switched off inside the run", small(GOOD_SKIP, ratchetRun("ORTHO_CHAIN_EVM_ANVIL=0 pnpm nx run e2e:on-chain-ratchet --outputStyle=static")), /not exactly/);
  caught("A06 the ratchet echoed", small(GOOD_SKIP, ratchetRun("echo pnpm nx run e2e:on-chain-ratchet --outputStyle=static")), /not exactly/);
  caught("A07 the ratchet with --help", small(GOOD_SKIP, ratchetRun("pnpm nx run e2e:on-chain-ratchet --outputStyle=static --help")), /not exactly/);
  caught("A08 a ratchet step if on a context the evaluator does not model", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { if: "env.SKIP != 'true' && !github.repository" })), /does not model|not env.SKIP/);
  caught("A09 a job if on github.event", small(GOOD_SKIP, (x) => x, "${{ needs.ready.outputs.draft == 'false' && !cancelled() && github.event.pull_request.base.ref != 'main' }}"), /does not model/);
  caught("A10 Anvil's switch as an expression", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { env: { ORTHO_CHAIN_EVM_ANVIL: "${{ github.repository && '0' || '1' }}" } })), /not exactly \{"ORTHO_CHAIN_EVM_ANVIL":"1"\}/);
  caught("A11 pull requests into main ignored", { ...small(GOOD_SKIP), on: { push: { branches: ["main"] }, pull_request: { types: ["opened"], "branches-ignore": ["main"] } } }, /`branches-ignore`/);
  caught("A12 pushes filtered by paths", { ...small(GOOD_SKIP), on: { push: { branches: ["main"], paths: ["nothing-here/**"] }, pull_request: { types: ["opened"] } } }, /`paths`/);
  caught("A13 a runner that does not exist", { ...small(GOOD_SKIP), jobs: { [JOB]: { ...small(GOOD_SKIP).jobs[JOB], "runs-on": "no-such-runner" } } }, /not ubuntu-latest/);
  caught("A14 a run that exits first", small(GOOD_SKIP, ratchetRun("cd /tmp && exit 0; pnpm nx run e2e:on-chain-ratchet --outputStyle=static")), /not exactly/);
  caught("A15 Anvil's step on a context the evaluator does not model", small(GOOD_SKIP, patch(/foundry-toolchain/, { if: "env.SKIP != 'true' && !github.repository" })), /does not model|not env.SKIP/);
  caught("A16 a job that needs another job's result", { ...small(GOOD_SKIP, (x) => x, "${{ needs.ready.outputs.draft == 'false' && needs.check.result == 'success' }}") }, /does not model/);
  caught("A17 a ratchet step if on run_attempt", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { if: "env.SKIP != 'true' && github.run_attempt == ''" })), /does not model|not env.SKIP/);
  caught("A18 a checkout of another branch", small(GOOD_SKIP, patch(/actions\/checkout/, { with: { "fetch-depth": 0, ref: "goal/stage-1" } })), /not exactly the whole history/);
  caught("a step that rewrites GITHUB_ENV", small(GOOD_SKIP, (x) => [...x.slice(0, 4), { if: "env.SKIP != 'true'", run: "echo ORTHO_CHAIN_EVM_ANVIL=0 >> $GITHUB_ENV" }, ...x.slice(4)]), /GITHUB_ENV/);
  caught("a step with a working-directory", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { "working-directory": "/tmp" })), /`working-directory`/);
  caught("two ratchet steps", small(GOOD_SKIP, (x) => [...x, { if: "env.SKIP != 'true'", run: "pnpm nx run e2e:on-chain-ratchet --outputStyle=static || true" }]), /2 steps name the ratchet/);
  caught("the job's env setting Anvil off", { ...small(GOOD_SKIP), jobs: { [JOB]: { ...small(GOOD_SKIP).jobs[JOB], env: { SKIP: guard(GOOD_SKIP), ORTHO_CHAIN_EVM_ANVIL: "0" } } } }, /job's env sets ORTHO_CHAIN_EVM_ANVIL/);
  // Path gating is allowed (Aaron, 26 November: CI must not become a bottleneck), within the rule: every push to main runs it, whole. Sharding is its own slice.
  const GATED = (extraSkip: string) => small(`${GOOD_SKIP} || (${extraSkip})`);
  it("passes a pull request skipped when affected.sh says the e2e project is not affected", () =>
    expect(workflowProblems(GATED("github.event_name == 'pull_request' && needs.changes.result == 'success' && needs.changes.outputs.affected_e2e == 'false'"))).toEqual([]));
  caught("a matrix on the job (a shard each)", { ...small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { run: "pnpm nx run e2e:on-chain-ratchet --outputStyle=static -- --shard=${{ matrix.shard }}/3" })), jobs: { [JOB]: { ...small(GOOD_SKIP).jobs[JOB], strategy: { matrix: { shard: [1, 2, 3] } } } } }, /`strategy`/);
  caught("a skip on affected_prove, the wrong project's output", GATED("github.event_name == 'pull_request' && needs.changes.result == 'success' && needs.changes.outputs.affected_prove == 'false'"), /a pull request into main: no step .*affected_e2e=true affected_prove=false/);
  caught("a skip on affected_e2e that also skips a push to main", GATED("needs.changes.outputs.affected_e2e == 'false' || needs.changes.outputs.fast == 'true'"), /a push to main: no step/);
  caught("a skip on fast", GATED("needs.changes.outputs.fast == 'true'"), /a pull request into main: no step .*fast=true/);
  caught("a skip when changes failed", GATED("needs.changes.result != 'success'"), /changes failure/);
  caught("a skip on affected_e2e that also skips when changes failed", GATED("needs.changes.outputs.affected_e2e == 'false'"), /a pull request into main: no step .*changes failure/);
  caught("a skip on an output changes does not have", GATED("needs.changes.outputs.affected_on_chain == 'false'"), /does not model the context needs\.changes\.outputs\.affected_on_chain/);
  it("does not mind a different way of saying the same (a `contains`, a `startsWith`, the 'main' kept in a list)", () => {
    const other = "!(contains('main,goal/on-chain', github.base_ref) && github.event_name == 'pull_request' || startsWith(github.ref, 'refs/heads/') && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/goal/on-chain')) || needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true'";
    expect(workflowProblems(small(other))).toEqual([]);
  });
});

// ---- (b) the relayer is marked experimental, where a person meets it ----
// Two hostile passes showed that free prose can't be judged by a list of words: every list had a synonym, a pronoun, a lookalike letter or a hidden
// element past it. So each place holds the marking word for word (the builder copies it from here), in ASCII, once; and outside the marking, the
// place says nothing more on the subject (TOPIC, below). What TOPIC can't name is left to the 🔍 review, which reads these four places whole.

/** The relayer README's first paragraph, word for word. */
export const MARK_README =
  "**Experimental** in the alpha (#784): a first receipt is treated as final, so a reorg is missed; a fill is broadcast before it is stored, so a restart may sign a second transaction at one nonce; a resumed transaction drops its access list; a failed first arm leaves the transaction in flight, so its nonce can block later ones. #784 holds the list as it stands.";
/** The line the doc comment of `export class Relayer` carries, word for word. */
export const MARK_DOC = " * @experimental The bugs in #784 are open: read it before you rely on the relayer.";
/** The canon page's row for the relayer, word for word. */
export const MARK_PAGE_ROW = "| the relayer | experimental (#784) | M6.07 |";
/** The status row's item and the sentence its notes carry about #784, word for word. */
export const MARK_ITEM = "Relayer (experimental) and follower: both actors are on `main`, and the relayer has reorg and ordering bugs";
export const MARK_NOTES =
  "snag #784 blocks it, so it stays building until the fixes and an app's journeys prove it: a first receipt is treated as final so a reorg is missed, a fill is broadcast before it is stored so a restart may sign a second transaction at one nonce, a resumed transaction drops its access list, and a failed first arm leaves the transaction in flight so its nonce can block later ones";

/** Outside the marking, a judged place says nothing more on the subject: no #784, no state or readiness, no limits or bugs, no strike-through, entity, tag or hidden text. */
export const TOPIC =
  /#784|experiment|\bstable\b|production|graduat|patch|\bfix(?:ed|es)?\b|\bsolved\b|resolved|removed|addressed|dealt with|\bhistory\b|works now|ship it|\blimits?\b|\bbugs?\b|out of date|outdated|\bignore\b|obsolete|no longer (?:experimental|true|open|appl)|not any ?more|~~|&#|&[a-z]+;|<\/?[a-z]|\bhidden\b|\bsnag\b|\bsorted\b|\bresolv/i;
const NOT_ASCII = /[^\x09\x0a\x0d\x20-\x7e]/;
const once = (text: string, mark: string) => text.split(mark).length - 1;
const topicOf = (text: string) => TOPIC.exec(text)?.[0];

export const readmeProblems = (readme: string): ReadonlyArray<string> => {
  const out: string[] = [];
  const body = readme.replace(/^# [^\n]*\n/, "");
  const first = body.trim().split(/\n\s*\n/)[0] ?? "";
  if (first.trim() !== MARK_README) out.push("the README's first paragraph is not the marking, word for word (MARK_README in this check)");
  if (once(readme, MARK_README) > 1) out.push("the README holds the marking more than once");
  if (NOT_ASCII.test(readme)) out.push(`the README holds a character outside ASCII: ${JSON.stringify(NOT_ASCII.exec(readme)?.[0])}`);
  const said = topicOf(readme.replace(MARK_README, ""));
  if (said !== undefined) out.push(`the README says more on the subject outside the marking: "${said}"`);
  return out;
};

/** The doc comment directly above `export class <name>`, whole. Empty when there is none. */
export const docOf = (source: string, name: string): string => {
  const at = source.search(new RegExp(`^export class ${name}\\b`, "m"));
  if (at < 0) return "";
  const before = source.slice(0, at).trimEnd();
  if (!before.endsWith("*/")) return "";
  const start = before.lastIndexOf("/**");
  return start < 0 ? "" : before.slice(start);
};
export const docProblems = (source: string): ReadonlyArray<string> => {
  const out: string[] = [];
  const declared = source.match(/^export class Relayer\b/gm)?.length ?? 0;
  if (declared !== 1) out.push(`the source has ${declared} lines \`export class Relayer\`, not one (one may sit inside a comment)`);
  const doc = docOf(source, "Relayer");
  if (doc === "") return [...out, "`export class Relayer` has no doc comment right above it"];
  const lines = doc.split("\n");
  if (lines.filter((l) => l === MARK_DOC).length !== 1) out.push("the Relayer's doc comment does not carry the marking line once, word for word (MARK_DOC in this check)");
  if (/^\s*\*?\s*(?:```|~~~)/m.test(doc)) out.push("the Relayer's doc comment has a code fence, which an editor shows as code, not as a tag");
  if (NOT_ASCII.test(doc)) out.push(`the Relayer's doc comment holds a character outside ASCII: ${JSON.stringify(NOT_ASCII.exec(doc)?.[0])}`);
  const rest = lines.filter((l) => l !== MARK_DOC).join("\n");
  if (/^\s*\*\s*@\w/m.test(rest)) out.push(`the Relayer's doc comment has another tag: ${/^\s*\*\s*(@\w+)/m.exec(rest)?.[1]}`);
  const said = topicOf(rest);
  if (said !== undefined) out.push(`the Relayer's doc comment says more on the subject outside the marking: "${said}"`);
  return out;
};

/** Words that say the relayer is not built yet. */
const STALE = /not written|not yet|to be (?:done|written|built)|comes? later|\blater\b|\bplanned\b|\bscheduled\b|\bunwritten\b|\bpending\b|\bupcoming\b|\btbd\b|not built|^\W*Not the relayer/i;
export const pageProblems = (page: string): ReadonlyArray<string> => {
  const out: string[] = [];
  if (/\bhidden\b|<details|display:\s*none|~~/i.test(page)) out.push(`the page hides or strikes text: ${/\bhidden\b|<details|display:\s*none|~~/i.exec(page)?.[0]}`);
  if (page.split("\n").filter((l) => l === MARK_PAGE_ROW).length !== 1) out.push("the page does not hold the relayer's row once, word for word (MARK_PAGE_ROW in this check)");
  // The units a reader takes in at once: each table row, and each paragraph or bullet (a bullet wraps over lines).
  const units: string[] = [];
  let block: string[] = [];
  const flush = () => { if (block.length > 0) units.push(block.join(" ")); block = []; };
  for (const l of page.split("\n")) {
    if (l.trim() === "" || l.startsWith("|") || /^\s*(?:[-*]|\d+\.)\s/.test(l) || /^#{1,6}\s/.test(l)) flush();
    if (l.startsWith("|")) units.push(l);
    else if (l.trim() !== "") block.push(l);
  }
  flush();
  for (const u of units.filter((x) => /\brelayer\b|#784/i.test(x) && x !== MARK_PAGE_ROW)) {
    const said = topicOf(u) ?? STALE.exec(u)?.[0];
    if (said !== undefined) out.push(`a line about the relayer, besides its row, says more on the subject: "${said}" in ${u.trim().slice(0, 80)}`);
    if (NOT_ASCII.test(u)) out.push(`a line about the relayer holds a character outside ASCII: ${u.trim().slice(0, 80)}`);
  }
  return out;
};

/** The status row, read the way the board reads it (tools/github/board.mjs's parseBoard), so a cell split can't differ. */
export const rowProblems = (status: string, parseBoard: (text: string) => { rows: ReadonlyArray<Json>; errors: ReadonlyArray<string> }): ReadonlyArray<string> => {
  const out: string[] = [];
  const raw = status.split("\n").filter((l) => /^\s*\|\s*relayer-follower\s*\|/.test(l));
  if (raw.length !== 1) return [`the status page has ${raw.length} rows with the id relayer-follower, not one`];
  if (NOT_ASCII.test(raw[0] ?? "")) out.push(`the row holds a character outside ASCII: ${JSON.stringify(NOT_ASCII.exec(raw[0] ?? "")?.[0])}`);
  const { rows, errors } = parseBoard(status);
  const row = rows.find((r) => r.id === "relayer-follower");
  for (const e of errors.filter((x) => /relayer-follower/.test(x))) out.push(`the board refuses the row: ${e}`);
  if (row === undefined) return [...out, "the board reads no row `relayer-follower`"];
  if (row.item !== MARK_ITEM) out.push("the row's item is not the marking, word for word (MARK_ITEM in this check)");
  if (row.stage !== "building") out.push(`the row's stage is "${row.stage}", not "building": #784 keeps it at building until the fixes and an app's journeys prove it`);
  if (row.release !== "preview" || row.milestone !== "alpha") out.push(`the row leaves the alpha (release "${row.release}", milestone "${row.milestone}")`);
  const notes = String(row.evidence ?? "");
  if (once(notes, MARK_NOTES) !== 1) out.push("the row's notes do not carry the #784 sentence once, word for word (MARK_NOTES in this check)");
  const said = topicOf(notes.replace(MARK_NOTES, ""));
  if (said !== undefined) out.push(`the row's notes say more on the subject outside the marking: "${said}"`);
  return out;
};

const READMES = "packages/host-cloudflare/src/modules/relayer/README.md";
const SERVICE = "packages/host-cloudflare/src/modules/relayer/service.ts";
const PAGE = "docs/canon/chains-and-wallets.mdx";
const STATUS = "docs/canon/status.md";
const board = async () => (await import(join(repo, "tools/github/board.mjs"))) as { parseBoard: (text: string) => { rows: ReadonlyArray<Json>; errors: ReadonlyArray<string> } };

describe("(b) the relayer is marked experimental, where a person meets it", () => {
  it("opens its module README with the word, #784 and its four limits", () => {
    expect(readmeProblems(read(READMES))).toEqual([]);
  });
  it("carries `@experimental` and #784 in the doc comment of `export class Relayer` (an editor's hover)", () => {
    expect(docProblems(read(SERVICE))).toEqual([]);
  });
  it("says it on the canon's chains-and-wallets page, where it lists what is built, and no longer says the relayer is not written", () => {
    expect(pageProblems(read(PAGE))).toEqual([]);
  });
  it("says it in the status page's row, in the item a reader sees, with #784 in its notes, and the row stays in the alpha", async () => {
    expect(rowProblems(read(STATUS), (await board()).parseBoard)).toEqual([]);
  });
  it("marks something that is there: the relayer is exported from the host's front door", () => {
    expect(read("packages/host-cloudflare/src/index.ts")).toMatch(/export \{ Relayer \}/);
  });
});

describe("(b) the judges are fair: what they pass and what they catch (planted files)", () => {
  const README = `# relayer\n\n${MARK_README}\n\n\`Relayer\`, the Durable Object that holds one relayer key.\n\n| Method | What it does |\n|---|---|\n| \`relay\` | sends |\n\nLater paragraphs.\n`;
  it("passes a README that does it right", () => expect(readmeProblems(README)).toEqual([]));
  const add = (extra: string) => README.replace(MARK_README, `${MARK_README}${extra}`);
  const caughtReadme = (name: string, text: string) => it(`catches ${name}`, () => expect(readmeProblems(text).length, readmeProblems(text).join("\n")).toBeGreaterThan(0));
  for (const [name, text] of [
    ["a README that says nothing", `# relayer\n\nThe Durable Object.\n\n| a |\n`],
    ["'not experimental'", README.replace("**Experimental** in the alpha", "This is not experimental")],
    ["the word only below the table", README.replace(`${MARK_README}\n\n`, "") + `\n${MARK_README}\n`],
    ["the fourth limit left out", README.replace("; a failed first arm leaves the transaction in flight, so its nonce can block later ones", "")],
    ["another issue number", README.replace("(#784)", "(#78)")],
    ["the marking twice", add(`\n\n${MARK_README}`)],
    // The first hostile pass (B01 to B04) and the review (P1):
    ["B01 the past tense", README.replace(MARK_README, "It was experimental until #784 closed. The old limits are fixed.")],
    ["B02 the marking only in an HTML comment", README.replace(MARK_README, `<!-- ${MARK_README} -->`)],
    ["B04 the follower marked, the relayer called ready", add(" The follower is experimental; the relayer is production-ready.")],
    ["P1 a later sentence that says the limits were removed", README.replace("Later paragraphs.", "These limits were all removed in 0.1.0-next.3, so it is ready for production use.")],
    // The second hostile pass (b01 to b29):
    ["b01 'these limits are history now'", add(" These limits are history now.")],
    ["b02 '#784 has been dealt with'", add(" #784 has been dealt with.")],
    ["b03 'all four are patched'", add(" All four are patched.")],
    ["b04 'it works now; ship it'", add(" It works now; ship it.")],
    ["b27 'all of them were fixed in next.3'", add(" All of them were fixed in next.3.")],
    ["b05 a zero-width space in 'fixed'", add(" #784 is fix​ed.")],
    ["b06 a Cyrillic letter in 'not'", add(" The relayer is nоt experimental any more.")],
    ["b07 an HTML entity", add(" #784 is fix&#101;d.")],
    ["b08 the marking struck through", README.replace(MARK_README, `~~${MARK_README}~~ Not any more.`)],
    ["b09 the marking moved into the past", README.replace("**Experimental** in the alpha (#784): a first", "**Experimental** in the alpha before 0.1.0-next.3, which addressed every limit #784 listed. In next.2: a first")],
    ["b10 the limits as a hypothetical", add(" That is what would happen without the patch in 0.1.0-next.3, which ships with the alpha.")],
    ["b20 the opening in <details>", README.replace(MARK_README, `<details>\n\n${MARK_README}\n\n</details>`)],
    ["b24 an 'Update' paragraph", README.replace("Later paragraphs.", "**Update:** the relayer has graduated; #784 is history.")],
    ["b29 a link that says closed", add(" See [#784 (closed)](https://example.invalid).")],
  ] as const) caughtReadme(name, text);

  const service = (doc: string, name = "Relayer") => `import x from "y";\n\n${doc}\nexport class ${name} extends DurableObject {}\n`;
  const GOOD_DOC = `/**\n * The relayer's Durable Object.\n *\n${MARK_DOC}\n */`;
  it("passes a doc comment that does it right", () => expect(docProblems(service(GOOD_DOC))).toEqual([]));
  const withDoc = (lines: string) => service(GOOD_DOC.replace(" */", `${lines}\n */`));
  const caughtDoc = (name: string, text: string) => it(`catches ${name}`, () => expect(docProblems(text).length, docProblems(text).join("\n")).toBeGreaterThan(0));
  for (const [name, text] of [
    ["no doc comment", service("")],
    ["a line comment, not a doc comment", service("// @experimental #784")],
    ["a doc comment without the tag", service("/**\n * Experimental (#784).\n */")],
    ["the tag with no issue", service("/**\n * @experimental\n */")],
    ["the tag on the follower and not the relayer", `${service(GOOD_DOC, "Follower")}\n${service("/** The relayer. */")}`],
    ["a comment with another statement between it and the class", `${GOOD_DOC}\nconst x = 1;\nexport class Relayer {}\n`],
    ["C01 the tag that says it no longer applies", service("/**\n * @experimental No longer: fixed in #784, safe for production.\n */")],
    ["C02 the tag inside a code fence", service(`/**\n * \`\`\`\n${MARK_DOC}\n * \`\`\`\n */`)],
    ["C03 a good class in a block comment above the real one", `/*\n${GOOD_DOC}\nexport class Relayer {}\n*/\n${service("/** The relayer. */")}`],
    ["P2 the tag that says the bugs are solved", service("/**\n * @experimental #784: all three bugs are now solved, use it freely.\n */")],
    ["b11 'patched; it is stable'", withDoc(" * The bugs in #784 are patched; it is stable.")],
    ["b12 no-break characters, 'production-ready'", service(GOOD_DOC.replace(MARK_DOC, " * @experimental #784 — no longer; production‑ready."))],
    ["b13 a @stable tag after it", withDoc(" * @stable Since 0.1.0-next.3.")],
    ["b25 a @remarks that says ignore the tag", withDoc(" * @remarks Ignore the tag above: it is out of date.")],
    ["b28 'well, were: all of them fixed'", withDoc(" * Well, were: all of them fixed in next.3.")],
  ] as const) caughtDoc(name, text);

  const BOARD_HEAD = "## 2. The capability map\n\n| id | Item | Stage | Pulled by | Release | Milestone | Lane | Touches | Needs | Evidence |\n|---|---|---|---|---|---|---|---|---|---|\n";
  const row = (item = MARK_ITEM, stage = "building", notes = `#679 (\`Follower\`, on \`main\`); ${MARK_NOTES}; #700 (fees are not bumped)`, release = "preview", milestone = "alpha") =>
    `${BOARD_HEAD}| relayer-follower | ${item} | ${stage} | framework | ${release} | ${milestone} | none | \`packages/host-cloudflare\` | none | ${notes} |\n\n## 3. Next\n`;
  const rowsOf = (text: string) => async () => rowProblems(text, (await board()).parseBoard);
  it("passes a row that does it right", async () => expect(await rowsOf(row())()).toEqual([]));
  const caughtRow = (name: string, text: string) => it(`catches ${name}`, async () => { const p = await rowsOf(text)(); expect(p.length, p.join("\n")).toBeGreaterThan(0); });
  for (const [name, text] of [
    ["an item that does not say it", row("Relayer and follower: both actors are on `main`, and the relayer has reorg and ordering bugs")],
    ["E01 'no longer experimental'", row(MARK_ITEM.replace("(experimental)", "(no longer experimental)"))],
    ["E02 a good row in a comment, the real row unmarked", `<!--\n${row()}-->\n${row("Relayer and follower: both")}`],
    ["E03 notes that say #784 is fixed", row(MARK_ITEM, "building", "snag #784 is fixed and closed, so nothing blocks it")],
    ["P3 the status moved from building to proved", row(MARK_ITEM, "built")],
    ["a row that leaves the alpha", row(MARK_ITEM, "building", undefined, "1.0", "getting paid")],
    ["a row that is gone", `${BOARD_HEAD}| other | Other: a | building | framework | preview | alpha | none | \`a\` | x | y |\n`],
    ["the notes without the fourth bug", row(MARK_ITEM, "building", `#679; ${MARK_NOTES.replace(", and a failed first arm leaves the transaction in flight so its nonce can block later ones", "")}`)],
    ["b14 'all patched since next.3' inside the #784 sentence", row(MARK_ITEM, "building", `${MARK_NOTES.replace("drops its access list", "drops its access list, all patched since next.3")}`)],
    ["b26 'all of them fixed in next.3' outside it", row(MARK_ITEM, "building", `${MARK_NOTES}; all of them fixed in next.3; slices M6.07`)],
    ["b15 an item that says production-ready", row(`${MARK_ITEM}, the relayer now production‑ready`)],
    ["b22 an escaped pipe that moves the stage", row(`${MARK_ITEM}\\| built`, "building")],
  ] as const) caughtRow(name, text);

  const page = (rows: string, extra = "") => `# chains\n\n## Status\n\n| Part | Status | Where |\n|---|---|---|\n${rows}\n| the follower | built | M6.09 |\n| the follower, corrections, the relayer | specified | M6.07, M6.09 |\n${extra}`;
  it("passes a page that does it right", () => expect(pageProblems(page(MARK_PAGE_ROW))).toEqual([]));
  const caughtPage = (name: string, text: string) => it(`catches ${name}`, () => expect(pageProblems(text).length, pageProblems(text).join("\n")).toBeGreaterThan(0));
  for (const [name, text] of [
    ["a page with no relayer row", page("")],
    ["the relayer's row without the word", page("| the relayer | proved | M6.07 |")],
    ["the word in a sentence, not in its row", page("| the relayer | proved | M6.07 |", "\nThe relayer is experimental.\n")],
    ["a stale 'not written' row next to the good one", page(`${MARK_PAGE_ROW}\n| the relayer and the follower | not written | planned |`)],
    ["a stale bullet that wraps", page(MARK_PAGE_ROW, "\n- **Not the relayer or the follower.** One relayer actor that submits (M6.07) and one follower\n  that turns logs into events (M6.09) come later.\n")],
    ["D01 'not yet written, to be done'", page(MARK_PAGE_ROW, "\n- **Not the relayer.** One relayer actor is not yet written; it is to be done in M6.07.\n")],
    ["D02 'no longer experimental (#784 fixed)'", page("| the relayer | no longer experimental (#784 fixed) | M6.07 |")],
    ["D03 the good row in an MDX comment", page(`{/*\n${MARK_PAGE_ROW}\n*/}\n| the relayer | built, production-ready | M6.07 |`)],
    ["P4 a sentence that the relayer is ready, its bugs solved", page(MARK_PAGE_ROW, "\nThe relayer is ready for production use; its bugs were all solved.\n")],
    ["b16 the good row in a hidden div", page("| the relayer | built, stable | M6.07 |", `\n<div hidden>\n\n${MARK_PAGE_ROW}\n\n</div>\n`)],
    ["b17 'unwritten, scheduled'", page(`${MARK_PAGE_ROW}\n| the relayer and the follower | unwritten, scheduled | M6.07, M6.09 |`)],
    ["b18 a bullet that says its limits are history", page(MARK_PAGE_ROW, "\n- **The relayer is experimental (#784).** Its limits are history since next.3; it works now.\n")],
    ["b19 the cell that calls it just a label", page("| the relayer | experimental (#784), which is just a label now: all four are patched | M6.07 |")],
    ["b21 a third cell that says gone", page("| the relayer | experimental (#784) | gone since next.3 |")],
    ["b23 'was experimental'", page(MARK_PAGE_ROW, "\n- The relayer was experimental.\n")],
  ] as const) caughtPage(name, text);
});

// ---- (c) no live page says the suite is not run on main ----

/** e2e/on-chain's README: the line naming the job, word for word (the author wrote it in this pull request; a builder may not edit e2e/). */
export const MARK_ONCHAIN = [
  "- `nx run e2e:on-chain-ratchet` is what CI's job `e2e-on-chain` runs on every pull request into `main` or `goal/on-chain` and every push to `main`",
  "  (Goal 18's slice 9 turns it on for `main`): green while every failure is listed.",
].join("\n");
export const onChainReadmeProblems = (readme: string): ReadonlyArray<string> => {
  const out: string[] = [];
  if (once(readme, MARK_ONCHAIN) !== 1) out.push("e2e/on-chain's README does not hold the line naming the job once, word for word (MARK_ONCHAIN in this check)");
  const other = readme.replace(MARK_ONCHAIN, "").split("\n").filter((l) => /\bmain\b/.test(l));
  if (other.length > 0) out.push(`e2e/on-chain's README says more about main: ${other[0]?.trim().slice(0, 90)}`);
  return out;
};
/** The climb: it names the suite once, in ALPHA_SUITES, and nothing in it marks a suite not run on main. */
export const climbProblems = (source: string): ReadonlyArray<string> => {
  const out: string[] = [];
  if (/NOT_RUN_ON_MAIN/.test(source)) out.push("tools/github/climb.mjs still has NOT_RUN_ON_MAIN");
  const named = source.match(/["'`]on-chain["'`]/g)?.length ?? 0;
  if (named !== 1 || !/export const ALPHA_SUITES = \[[^\]]*"on-chain"[^\]]*\]/.test(source)) out.push(`tools/github/climb.mjs names "on-chain" ${named} times, not once, in ALPHA_SUITES`);
  if (/not run on main|slice 9|run on main/i.test(source)) out.push(`tools/github/climb.mjs still says: ${/not run on main|slice 9|run on main/i.exec(source)?.[0]}`);
  return out;
};
/** The climb dashboard's README: once the suite runs like the others, it has nothing to say about it. */
export const dashboardProblems = (readme: string): ReadonlyArray<string> => (/on-chain/i.test(readme) ? [`the climb dashboard's README still speaks of the on-chain suite: ${readme.split("\n").find((l) => /on-chain/i.test(l))?.trim().slice(0, 90)}`] : []);

describe("(c) the judges are fair (planted files)", () => {
  const CLIMB = 'export const ALPHA_SUITES = ["m0", "m1", "on-chain", "grid"];\nexport const NOT_ALPHA = ["m1/40.test.ts"];\nconst status = (s, v) => `${v} green`;\n';
  it("passes a climb that does it right", () => expect(climbProblems(CLIMB)).toEqual([]));
  it.each([
    ["today's NOT_RUN_ON_MAIN", `${CLIMB}export const NOT_RUN_ON_MAIN = ["on-chain"];\n`],
    ["F01 an empty list pushed to later", `${CLIMB}export const NOT_RUN_ON_MAIN = [];\nNOT_RUN_ON_MAIN.push("on-chain");\n`],
    ["c01 the same list under another name", `${CLIMB}const NOT_YET = ["on-chain"];\n`],
    ["c08 the suite named in the status code", CLIMB.replace("`${v} green`", "s === \"on-chain\" ? 'not run on main' : `${v} green`")],
  ])("catches %s", (_, text) => expect(climbProblems(text).length).toBeGreaterThan(0));
  it("passes a dashboard README that says nothing of it", () => expect(dashboardProblems("- **What the tests leave out:** The grid's reds live in a file.")).toEqual([]));
  it.each([
    "`e2e/on-chain`'s lists are kept, but CI runs that suite only on `goal/on-chain` until Goal 18's slice 9",
    "`e2e/on-chain` isn't run on `main` yet",
    "CI skips `e2e/on-chain` on main",
    "CI doesn't run `e2e/on-chain` on `main`;",
    "`e2e/on-chain` is never run on `main`.",
  ])("catches a stale dashboard line: %s", (l) => expect(dashboardProblems(`- **What the tests leave out:** ${l} The grid.`).length).toBeGreaterThan(0));
  const ONCHAIN = `# e2e/on-chain\n\nThe ratchet.\n\n${MARK_ONCHAIN}\n- \`nx run e2e:on-chain\` is the done check.\n`;
  it("passes an on-chain README that does it right", () => expect(onChainReadmeProblems(ONCHAIN)).toEqual([]));
  it.each([
    ["today's line", ONCHAIN.replace(MARK_ONCHAIN, "- `nx run e2e:on-chain-ratchet` is what CI runs on every pull request into `goal/on-chain` (job `e2e-on-chain`): green")],
    ["F05 'never on main'", ONCHAIN.replace("into `main` or `goal/on-chain`", "into `goal/on-chain`, never on `main`")],
    ["c06 another line that takes it back", `${ONCHAIN}- Until Goal 18's next slice, CI does not run this suite on \`main\`.\n`],
    ["c07 'would run', 'today it is off'", ONCHAIN.replace("runs on every", "would run on every")],
  ])("catches %s", (_, text) => expect(onChainReadmeProblems(text).length).toBeGreaterThan(0));
});

describe("(c) no live page still says the on-chain suite is not run on main", () => {
  it("the climb counts it as run: on-chain is named once, in ALPHA_SUITES, and nothing marks it not run on main", () => {
    expect(climbProblems(read("tools/github/climb.mjs"))).toEqual([]);
  });
  it("the climb dashboard's README does not say the suite is not run on main", () => {
    expect(dashboardProblems(read("tools/github/climb-dashboard/README.md"))).toEqual([]);
  });
  it("e2e/on-chain's README says its CI job runs on main", () => {
    expect(onChainReadmeProblems(read("e2e/on-chain/README.md"))).toEqual([]);
  });
});
