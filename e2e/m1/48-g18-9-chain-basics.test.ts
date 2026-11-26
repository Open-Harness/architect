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
// Two lines of 05's list pass now and are the builder's to remove. The job may shard the ratchet (a matrix whose shards cover 1 to N) and may skip a pull request that affected.sh says leaves the
// e2e project alone, so it need not be a bottleneck (Aaron, 26 November); every push to main runs it whole. Each red line here names a file a -build branch may edit.
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
export interface Scenario extends Event { readonly result: "success" | "failure"; readonly outputs: Outputs; readonly shard?: number }

const JOB = "e2e-on-chain";
const RATCHET = "e2e:on-chain-ratchet";

/** The steps of the on-chain job that run for one event, in order, each with the env it would see; `undefined` when the job itself does not run. `matrix` is in the context only when the job has a strategy. */
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
    ...(job.strategy === undefined ? {} : { matrix: { shard: s.shard ?? null } }),
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
/** The shards the job's matrix runs, or undefined when it has none. */
const shardsOf = (workflow: Json): ReadonlyArray<unknown> | undefined => {
  const strategy = workflow.jobs?.[JOB]?.strategy;
  if (strategy === undefined) return undefined;
  return Array.isArray(strategy?.matrix?.shard) ? strategy.matrix.shard : [];
};

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
  for (const k of extra(job, ["name", "needs", "if", "runs-on", "timeout-minutes", "env", "steps", "strategy"])) out.push(`the job has \`${k}\`, which this check does not allow`);
  const shards = shardsOf(workflow);
  if (job.strategy !== undefined) {
    for (const k of extra(job.strategy, ["matrix", "fail-fast"])) out.push(`the job's strategy has \`${k}\`, which this check does not allow`);
    for (const k of extra(job.strategy?.matrix, ["shard"])) out.push(`the job's matrix has \`${k}\`, not only shard`);
    const n = shards?.length ?? 0;
    const want = Array.from({ length: n }, (_, i) => i + 1);
    if (n === 0 || !sameJson([...(shards ?? [])].sort((a, b) => Number(a) - Number(b)), want)) out.push(`the matrix's shards are ${JSON.stringify(shards)}, not 1 to N, each once`);
  }
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
    const want = shards === undefined ? RATCHET_RUN : `${RATCHET_RUN} -- --shard=\${{ matrix.shard }}/${shards.length}`;
    if (String(r.run).trim() !== want) out.push(`the ratchet step runs \`${String(r.run).trim()}\`, not exactly \`${want}\`${shards === undefined ? "" : " (one shard of the matrix's N each)"}`);
    if (!sameJson(r.env, { ORTHO_CHAIN_EVM_ANVIL: "1" })) out.push(`the ratchet step's env is ${JSON.stringify(r.env)}, not exactly {"ORTHO_CHAIN_EVM_ANVIL":"1"}`);
  }
  return out;
};

/** The verdict on a workflow: for each event, each answer `changes` can give and each shard, what must happen. One line per way it is wrong (with the first case it is wrong in); an expression the evaluator cannot read is one too. */
export const workflowProblems = (workflow: Json): ReadonlyArray<string> => {
  const found = new Map<string, string[]>();
  const add = (key: string, when: string) => found.set(key, [...(found.get(key) ?? []), when]);
  for (const ev of Object.values(EVENTS) as ReadonlyArray<Event>)
    for (const a of answers(ev.event)) {
      const must = rule(ev.event, a);
      if (must === "either") continue;
      for (const shard of shardsOf(workflow) ?? [undefined]) {
        const when = `${said(a)}${shard === undefined ? "" : `, shard ${String(shard)}`}`;
        try {
          const steps = stepsThatRun(workflow, { ...ev, ...a, ...(shard === undefined ? {} : { shard: Number(shard) }) });
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
  const all = workflowProblems(ci());
  const shape = shapeProblems(ci());
  const about = (prefix: string) => [...shape, ...all.filter((p) => p.startsWith(prefix))];
  it("runs the ratchet, with Anvil and the whole history, on a pull request into main", () => {
    expect(about(`${EVENTS.prMain.name}:`), "the job's steps for a pull request into main").toEqual([]);
  });
  it("runs it on a push to main", () => {
    expect(about(`${EVENTS.pushMain.name}:`), "the job's steps for a push to main").toEqual([]);
  });
  it("still runs it for the goal's own branch (a pull request into goal/on-chain, a push to it)", () => {
    expect(about(`${EVENTS.prGoal.name}:`), "pull request into goal/on-chain").toEqual([]);
    expect(about(`${EVENTS.pushGoal.name}:`), "push to goal/on-chain").toEqual([]);
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
  // Sharding and path gating are allowed (Aaron, 26 November: CI must not become a bottleneck), within the rule: every push to main runs it, whole.
  const SHARDED = (n: number, shards: ReadonlyArray<number>, run = `pnpm nx run e2e:on-chain-ratchet --outputStyle=static -- --shard=\${{ matrix.shard }}/${n}`): Json => {
    const wf = small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { run }));
    return { ...wf, jobs: { [JOB]: { ...wf.jobs[JOB], strategy: { "fail-fast": false, matrix: { shard: shards } } } } };
  };
  const GATED = (extraSkip: string) => small(`${GOOD_SKIP} || (${extraSkip})`);
  it("passes the ratchet in three shards that cover 1 to 3", () => expect(workflowProblems(SHARDED(3, [1, 2, 3]))).toEqual([]));
  it("passes a pull request skipped when affected.sh says the e2e project is not affected", () =>
    expect(workflowProblems(GATED("github.event_name == 'pull_request' && needs.changes.result == 'success' && needs.changes.outputs.affected_e2e == 'false'"))).toEqual([]));
  caught("shards that leave one out (1 and 2 of 3)", SHARDED(3, [1, 2]), /not exactly .*--shard=\$\{\{ matrix\.shard \}\}\/2|not 1 to N/);
  caught("a shard run twice", SHARDED(2, [1, 1, 2], "pnpm nx run e2e:on-chain-ratchet --outputStyle=static -- --shard=${{ matrix.shard }}/2"), /not 1 to N/);
  caught("a shard 0", SHARDED(3, [0, 1, 2]), /not 1 to N/);
  caught("a matrix whose ratchet does not shard (the whole suite N times)", SHARDED(2, [1, 2], "pnpm nx run e2e:on-chain-ratchet --outputStyle=static"), /one shard of the matrix's N each/);
  caught("a shard flag with no matrix", small(GOOD_SKIP, patch(/e2e:on-chain-ratchet/, { run: "pnpm nx run e2e:on-chain-ratchet --outputStyle=static -- --shard=${{ matrix.shard }}/3" })), /not exactly/);
  caught("a matrix on another key", { ...small(GOOD_SKIP), jobs: { [JOB]: { ...small(GOOD_SKIP).jobs[JOB], strategy: { matrix: { os: ["a"] } } } } }, /not only shard|not 1 to N/);
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

/** `experimental`, said of the thing and not denied. */
const SAYS = /(?<!\bnot\s)(?<!\bno\s)(?<!\bnon-)(?<!\bun)\bexperimental\b/i;
export const says = (s: string) => SAYS.test(s);
/** What a reader sees: HTML and MDX comments and fenced code blocks taken out. */
export const visible = (s: string) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "").replace(/^([ \t]*(?:\*[ \t]*)?)(```|~~~)[\s\S]*?^\1\2[^\n]*$/gm, "");
/** Words that take the marking back: it was, it is no longer, it is fixed, it is ready. */
const CONDITION = /\b(?:until|once|when|if|after)\s+(?:#784|the (?:bugs?|limits?|fixes?)|they|it)\b[^.;!?]{0,30}?\b(?:is|are|have been|has been)\s+(?:fixed|solved|resolved|closed|removed)\b/gi;
/** Text with its conditions taken out ("until #784 is fixed" says nothing about now). */
export const unconditioned = (t: string) => t.replace(CONDITION, "");
/** A sentence that says #784's limits are gone: it names the relayer, #784, its bugs or limits, and calls them removed, solved, fixed, resolved, gone or closed, or the relayer ready or safe for production. A condition ("until #784 is fixed", "once the bugs are solved") is not a claim, and is taken out first. */
export const saysGone = (text: string): string | undefined => {
  const SUBJECT = /\brelayer\b|#784\b|\bbugs?\b|\blimits?\b|\bfindings?\b|\bsnag\b/i;
  const CLAIM = /\b(?:removed|solved|fixed|resolved|gone|closed|lifted)\b|\bready for (?:production|use)\b|\bproduction[- ]ready\b|\bsafe (?:for production|to use)\b|\buse it freely\b|\bnothing blocks it\b/i;
  return visible(text).split(/[.;!?]\s|\n\s*\n|\|/).map((x) => x.replace(CONDITION, "")).find((x) => SUBJECT.test(x) && CLAIM.test(x))?.trim();
};
/** A count of the bugs, which goes stale when #784 grows (it did: a fourth came in its first comment). */
export const COUNTS = /\b(?:one|two|three|four|five|six|\d+)\s+(?:open\s+)?(?:bugs|limits|findings)\b/i;
export const DENIES = /\bno longer\b|\b(?:never|isn['’]t|is not|not)\b[^.;]{0,20}\bexperimental\b|\b(?:was|were|formerly)\b[^.;]{0,30}\bexperimental\b|\bproduction[- ]ready\b|\bsafe for production\b|#784\W{0,3}(?:is |was |has been )?(?:now )?(?:fixed|closed|resolved)\b|\b(?:fixed|closed|resolved) (?:in|by) #784/i;

/** A README's opening: its title is skipped, and it runs to the first table or the second heading. */
const opening = (readme: string): string => {
  const lines = readme.split("\n");
  const out: string[] = [];
  let started = false;
  for (const line of lines) {
    if (/^# /.test(line) && !started) { started = true; continue; }
    if (/^\|/.test(line) || (started && /^#{1,6} /.test(line))) break;
    out.push(line);
  }
  return out.join("\n");
};
/** What the README says under a heading that has the word in it: where a longer account of the limits may sit. */
const sectionsNamingIt = (readme: string): string => {
  const parts = readme.split(/^(?=#{2,6} )/m);
  return parts.filter((p) => /^#{2,6} .*experimental/i.test(p)).join("\n");
};
/** The four limits #784 names (three in its body, one in its first comment), each by what a reader would look for. */
export const LIMITS: ReadonlyArray<readonly [string, RegExp]> = [
  ["a first receipt is final, so a reorg is missed", /\ba reorg is missed\b/i],
  ["a fill is sent before it is stored, so a restart may sign a second transaction at one nonce", /\bfill\b[^.;]{0,80}\bbefore it is stored\b[^.;]{0,40}\ba restart may sign a second transaction at one nonce\b/i],
  ["a resumed transaction drops its access list", /\ba resumed transaction drops its access list\b/i],
  ["a failed first arm leaves the transaction in flight, so its nonce can block later ones", /\bfirst arm\b[^.;]{0,80}\bin flight\b[^.;]{0,80}\bblock later\b/i],
];
export const readmeProblems = (raw: string): ReadonlyArray<string> => {
  const readme = visible(raw);
  const block = `${opening(readme)}\n${sectionsNamingIt(readme)}`;
  const out: string[] = [];
  const first = opening(readme).trim().split(/\n\s*\n/)[0] ?? "";
  if (!says(opening(readme)) || !/^\*\*Experimental\*\* in the alpha\b/.test(first)) out.push("the README's opening does not say the relayer is experimental: its first paragraph does not begin `**Experimental** in the alpha`");
  if (DENIES.test(unconditioned(block))) out.push(`the opening takes the marking back: ${DENIES.exec(unconditioned(block))?.[0]}`);
  const gone = saysGone(readme);
  if (gone !== undefined) out.push(`the README says #784's limits are gone: ${gone.slice(0, 100)}`);
  if (COUNTS.test(block)) out.push(`the opening counts the bugs (${COUNTS.exec(block)?.[0]}); name #784's list instead`);
  if (!/#784\b/.test(block)) out.push("the opening (or its experimental section) does not name #784");
  for (const [what, pattern] of LIMITS) if (!pattern.test(block)) out.push(`the opening (or its experimental section) does not say: ${what}`);
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
  const whole = docOf(source, "Relayer");
  const doc = visible(whole);
  const out: string[] = [];
  const declared = source.match(/^export class Relayer\b/gm)?.length ?? 0;
  if (declared !== 1) out.push(`the source has ${declared} lines \`export class Relayer\`, not one (one may sit inside a comment)`);
  if (whole === "") out.push("`export class Relayer` has no doc comment right above it");
  const tag = /^\s*\*\s*@experimental\b(.*)$/m.exec(doc);
  if (tag === null) out.push("the Relayer's doc comment has no `@experimental` tag");
  if (!/#784\b/.test(tag?.[1] ?? "")) out.push("the Relayer's doc comment does not name #784 on its `@experimental` line");
  if (DENIES.test(unconditioned(doc))) out.push(`the Relayer's doc comment takes the marking back: ${DENIES.exec(unconditioned(doc))?.[0]}`);
  const gone = saysGone(doc.replace(/^\s*\/?\*+\/?/gm, ""));
  if (gone !== undefined) out.push(`the Relayer's doc comment says #784's limits are gone: ${gone.slice(0, 100)}`);
  if (COUNTS.test(doc)) out.push(`the Relayer's doc comment counts the bugs (${COUNTS.exec(doc)?.[0]}); name #784 instead`);
  return out;
};

/** The canon page: the lines about the relayer (a table row or a sentence) say it is experimental, and none says it is not written or comes later. */
export const pageProblems = (raw: string): ReadonlyArray<string> => {
  const page = visible(raw);
  // The units a reader takes in at once: each table row, and each paragraph or bullet (a bullet wraps over lines, so "Not the relayer ... come later" is one unit).
  const units: string[] = [];
  let block: string[] = [];
  const flush = () => { if (block.length > 0) units.push(block.join(" ")); block = []; };
  for (const l of page.split("\n")) {
    if (l.trim() === "" || /^\|/.test(l) || /^\s*(?:[-*]|\d+\.)\s/.test(l) || /^#{1,6}\s/.test(l)) flush();
    if (/^\|/.test(l)) units.push(l);
    else if (l.trim() !== "") block.push(l);
  }
  flush();
  const lines = units.filter((l) => /\brelayer\b/i.test(l));
  const out: string[] = [];
  if (lines.length === 0) return ["the page does not mention the relayer"];
  const cellsOf = (l: string) => l.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
  if (!lines.some((l) => /^\|/.test(l) && /\brelayer\b/i.test(cellsOf(l)[0] ?? "") && /^experimental\b/i.test(cellsOf(l)[1] ?? ""))) out.push("no table row about the relayer says it is experimental: no row names the relayer in its first cell with a status that begins `experimental`");
  for (const l of lines) if (/not written|not yet|to be (?:done|written|built)|comes? later|\blater\b|\bplanned\b|not built|^\W*Not the relayer/i.test(l)) out.push(`a line about the relayer still says it is not built: ${l.trim().slice(0, 90)}`);
  for (const l of lines) if (DENIES.test(unconditioned(l))) out.push(`a line about the relayer takes the marking back: ${l.trim().slice(0, 90)}`);
  for (const l of units.filter((u) => /\brelayer\b|#784\b/i.test(u))) { const gone = saysGone(l); if (gone !== undefined) out.push(`a line about the relayer says #784's limits are gone: ${gone.slice(0, 90)}`); }
  return out;
};

/** The status page's row for the relayer and the follower: its item says experimental, its notes name #784, and it stays in the alpha. */
export const rowProblems = (status: string): ReadonlyArray<string> => {
  const rows = status.split("\n").filter((l) => /^\|\s*relayer-follower\s*\|/.test(l));
  if (rows.length > 1) return [`the status page has ${rows.length} rows \`relayer-follower\`, not one`];
  const row = visible(status).split("\n").find((l) => /^\|\s*relayer-follower\s*\|/.test(l));
  if (row === undefined) return ["the status page has no row `relayer-follower`"];
  const cells = row.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
  const out: string[] = [];
  if (cells.length !== 10) out.push(`the row has ${cells.length} cells, not 10`);
  const [, item = "", stage = "", , release = "", milestone = ""] = cells;
  if (stage !== "building") out.push(`the row's status is "${stage}", not "building": #784 keeps it at building until the fixes and an app's journeys prove it`);
  const notes = cells.at(-1) ?? "";
  if (!says(item) || !/\bRelayer \(experimental\)/.test(item)) out.push("the row's item does not say experimental: it does not name `Relayer (experimental)`");
  const goneRow = saysGone(item) ?? saysGone(notes);
  if (goneRow !== undefined) out.push(`the row says #784's limits are gone: ${goneRow.slice(0, 90)}`);
  if (DENIES.test(unconditioned(item)) || DENIES.test(unconditioned(notes))) out.push(`the row takes the marking back: ${DENIES.exec(unconditioned(item))?.[0] ?? DENIES.exec(unconditioned(notes))?.[0]}`);
  if (!/#784 blocks it\b/.test(notes)) out.push("the row's notes do not say #784 blocks it");
  if (!/\brelayer\b/i.test(item)) out.push("the row's item does not name the relayer");
  if (!/#784\b/.test(notes)) out.push("the row's notes do not name #784");
  if (release !== "preview" || milestone !== "alpha") out.push(`the row leaves the alpha (release "${release}", milestone "${milestone}")`);
  return out;
};

const READMES = "packages/host-cloudflare/src/modules/relayer/README.md";
const SERVICE = "packages/host-cloudflare/src/modules/relayer/service.ts";
const PAGE = "docs/canon/chains-and-wallets.mdx";
const STATUS = "docs/canon/status.md";

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
  it("says it in the status page's row, in the item a reader sees, with #784 in its notes, and the row stays in the alpha", () => {
    expect(rowProblems(read(STATUS))).toEqual([]);
  });
  it("marks something that is there: the relayer is exported from the host's front door", () => {
    expect(read("packages/host-cloudflare/src/index.ts")).toMatch(/export \{ Relayer \}/);
  });
});

describe("(b) the judges are fair: what they pass and what they catch (planted files)", () => {
  const readme = (extra: string, limits = "A first receipt is final, so a reorg is missed (#784); a fill is sent before it is stored, so a restart may sign a second transaction at one nonce; a resumed transaction drops its access list; a failed first arm leaves the transaction in flight, so its nonce can block later ones.") =>
    `# relayer\n\n**Experimental** in the alpha. ${limits}${extra}\n\n| Method | What it does |\n|---|---|\n| \`relay\` | sends |\n\nLater paragraphs.\n`;
  it("passes a README that does it right", () => expect(readmeProblems(readme(""))).toEqual([]));
  it("passes the limits in a section headed with the word, when the opening says it", () => {
    const text = `# relayer\n\n**Experimental** in the alpha, see #784.\n\n## Experimental: what is wrong\n\nA reorg is missed; a fill is sent before it is stored, so a restart may sign a second transaction at one nonce; a resumed transaction drops its access list; a failed first arm leaves the transaction in flight, so its nonce can block later ones.\n\n| a |\n`;
    expect(readmeProblems(text)).toEqual([]);
  });
  const caughtReadme = (name: string, text: string, expected: RegExp) => it(`catches ${name}`, () => {
    const found = readmeProblems(text);
    expect(found.join("\n")).toMatch(expected);
  });
  caughtReadme("a README that says nothing", `# relayer\n\nThe Durable Object.\n\n| a |\n`, /does not say the relayer is experimental/);
  caughtReadme("'not experimental'", readme("").replace("**Experimental** in the alpha", "This is not experimental"), /does not say the relayer is experimental/);
  caughtReadme("'unexperimental' and 'non-experimental'", readme("").replace("**Experimental**", "It is non-experimental, unexperimental"), /does not say the relayer is experimental/);
  caughtReadme("the word only below the table", `# relayer\n\nThe Durable Object. #784 A reorg, a fill before a restart, an access list.\n\n| a |\n|---|\n\nExperimental.\n`, /does not say the relayer is experimental/);
  caughtReadme("the word only in a later section not named with it", `# relayer\n\nThe Durable Object. #784 A reorg, a fill before a restart, an access list.\n\n## Notes\n\nIt is experimental.\n`, /does not say the relayer is experimental/);
  caughtReadme("no #784", readme("").replace("(#784)", ""), /does not name #784/);
  caughtReadme("a different issue number", readme("").replace("#784", "#78"), /does not name #784/);
  caughtReadme("no reorg", readme("", "A first receipt is final (#784); a fill is sent before it is stored, so a restart may sign twice; an access list is dropped."), /reorg is missed/);
  caughtReadme("no fill and restart", readme("", "A reorg is missed (#784); a resumed transaction drops its access list."), /second transaction at one nonce/);
  caughtReadme("a fill with no restart", readme("", "A reorg is missed (#784); a fill is a thing; an access list is dropped."), /second transaction at one nonce/);
  caughtReadme("no access list", readme("", "A reorg is missed (#784); a fill is sent before it is stored, so a restart may sign twice."), /access list/);
  // The hostile pass (26 November 2026): each wrong README below passed the first judge, and is planted here.
  caughtReadme("B01 the past tense, and the limits said fixed", `# relayer\n\nIt was experimental until #784 closed. The old limits are fixed: a reorg is no longer missed, a fill is no longer broadcast before it is stored so a restart cannot double-sign, and a resumed transaction keeps its access list.\n\n| a |\n`, /does not say the relayer is experimental/);
  caughtReadme("B02 the marking only in an HTML comment", `# relayer\n\n<!-- **Experimental** in the alpha (#784): a reorg is missed; a fill is sent before it is stored, so a restart may sign a second transaction at one nonce; a resumed transaction drops its access list. -->\n\nThe Durable Object.\n\n| a |\n`, /does not say the relayer is experimental/);
  caughtReadme("B03 'isn't experimental and is never experimental'", readme("").replace("**Experimental** in the alpha.", "The relayer isn't experimental and is never experimental (#784 closed)."), /does not say the relayer is experimental|takes the marking back/);
  caughtReadme("B04 the follower marked, the relayer called ready", readme("").replace("**Experimental** in the alpha.", "The follower is **experimental** in the alpha; the relayer is production-ready."), /does not say the relayer is experimental|takes the marking back/);
  caughtReadme("a good opening that then says it is fixed", readme(" #784 is fixed now."), /takes the marking back/);
  // The lead's review of #1095 (26 November 2026): P1 to P4 passed the second judge; each is planted with its siblings.
  caughtReadme("P1 a later sentence that says the limits were removed", readme("\n\nThese limits were all removed in 0.1.0-next.3, so it is ready for production use."), /limits are gone/);
  caughtReadme("P1' the bugs solved, in the opening", readme(" All of #784's bugs are solved now."), /limits are gone/);
  caughtReadme("P1'' far below the table", `${readme("")}\n## Notes\n\nThe relayer is safe to use: #784 was resolved.\n`, /limits are gone/);
  caughtReadme("the fourth limit left out", readme("", "A first receipt is final, so a reorg is missed (#784); a fill is sent before it is stored, so a restart may sign a second transaction at one nonce; a resumed transaction drops its access list."), /in flight/);
  caughtReadme("a count of the bugs", readme(" Three bugs are open."), /counts the bugs/);
  it("passes a condition, which is not a claim (\"until #784 is fixed\")", () => expect(readmeProblems(readme(" It stays so until #784 is fixed."))).toEqual([]));
  caughtReadme("the limits only far below the opening", `# relayer\n\nExperimental, #784.\n\n| a |\n|---|\n\nA reorg is missed; a fill before a restart; an access list is dropped.\n`, /does not say: a first receipt/);

  const service = (doc: string, name = "Relayer") => `import x from "y";\n\n${doc}\nexport class ${name} extends DurableObject {}\n`;
  const GOOD_DOC = "/**\n * The relayer's Durable Object.\n *\n * @experimental The bugs in #784 are open.\n */";
  it("passes a doc comment that does it right", () => expect(docProblems(service(GOOD_DOC))).toEqual([]));
  const caughtDoc = (name: string, text: string, expected: RegExp) => it(`catches ${name}`, () => expect(docProblems(text).join("\n")).toMatch(expected));
  caughtDoc("no doc comment", service(""), /has no doc comment/);
  caughtDoc("a line comment, not a doc comment", service("// @experimental #784"), /has no doc comment/);
  caughtDoc("a doc comment without the tag", service("/**\n * Experimental (#784).\n */"), /no `@experimental` tag/);
  caughtDoc("the tag in the middle of a sentence, not as a tag", service("/**\n * Use @experimental sparingly (#784).\n */"), /no `@experimental` tag/);
  caughtDoc("the tag with no issue", service("/**\n * @experimental\n */"), /does not name #784/);
  caughtDoc("the tag on the follower and not the relayer", `${service(GOOD_DOC, "Follower")}\n${service("/** The relayer. */")}`, /no `@experimental` tag/);
  caughtDoc("C01 the tag that says it no longer applies", service("/**\n * @experimental No longer: fixed in #784, safe for production.\n */"), /takes the marking back/);
  caughtDoc("C02 the tag inside a code fence", service("/**\n * ```\n * @experimental (#784)\n * ```\n */"), /no `@experimental` tag/);
  caughtDoc("C03 a good class in a block comment above the real one", `/*\n${GOOD_DOC}\nexport class Relayer {}\n*/\n${service("/** The relayer. */")}`, /2 lines `export class Relayer`/);
  caughtDoc("P2 the tag that says the bugs are solved", service("/**\n * @experimental #784: all three bugs are now solved, use it freely.\n */"), /limits are gone/);
  caughtDoc("P2' the tag, then a line that says it is fixed", service("/**\n * @experimental (#784)\n * The relayer is fixed and ready for production.\n */"), /limits are gone/);
  caughtDoc("a count of the bugs on the tag", service("/**\n * @experimental Three bugs are open (#784).\n */"), /counts the bugs/);
  caughtDoc("#784 named elsewhere in the comment, not on the tag", service("/**\n * The relayer (#784).\n * @experimental\n */"), /on its `@experimental` line/);
  caughtDoc("a comment with another statement between it and the class", `${GOOD_DOC}\nconst x = 1;\nexport class Relayer {}\n`, /has no doc comment/);

  const row = (item: string, notes: string, release = "preview", milestone = "alpha") =>
    `| id | Item |\n|---|---|\n| relayer-follower | ${item} | building | framework | ${release} | ${milestone} | none | \`a\` | wallets-keys | ${notes} |\n`;
  it("passes a row that does it right", () => expect(rowProblems(row("Relayer (experimental) and follower: both actors are on `main`", "snag #784 blocks it"))).toEqual([]));
  const caughtRow = (name: string, text: string, expected: RegExp) => it(`catches ${name}`, () => expect(rowProblems(text).join("\n")).toMatch(expected));
  caughtRow("an item that does not say it", row("Relayer and follower", "experimental, #784"), /item does not say experimental/);
  caughtRow("'not experimental'", row("Relayer and follower, not experimental", "#784"), /item does not say experimental/);
  caughtRow("the word in the notes only", row("Relayer and follower", "the relayer is experimental, #784"), /item does not say experimental/);
  caughtRow("an item that marks the follower and not the relayer", row("Follower (experimental)", "#784"), /does not name the relayer/);
  caughtRow("no #784 in the notes", row("Relayer (experimental) and follower", "snag open"), /do not name #784/);
  caughtRow("a row that leaves the alpha", row("Relayer (experimental) and follower", "#784", "1.0", "getting paid"), /leaves the alpha/);
  caughtRow("a row that is gone", `| id |\n|---|\n| other | a |\n`, /no row `relayer-follower`/);
  caughtRow("E01 'no longer experimental'", row("Relayer (no longer experimental) and follower", "snag #784 blocks it"), /item does not say experimental|takes the marking back/);
  caughtRow("E02 a good row in a comment, the real row unmarked", `<!--\n${row("Relayer (experimental) and follower", "snag #784 blocks it")}-->\n${row("Relayer and follower", "snag #784 blocks it")}`, /2 rows|item does not say/);
  caughtRow("E03 notes that say #784 is fixed", row("Relayer (experimental) and follower", "snag #784 is fixed and closed, so nothing blocks it"), /takes the marking back|do not say #784 blocks it/);
  caughtRow("P3 the status moved from building to proved", `| id | Item |\n|---|---|\n| relayer-follower | Relayer (experimental) and follower | proved | framework | preview | alpha | none | \`a\` | wallets-keys | snag #784 blocks it |\n`, /not "building"/);
  caughtRow("P3' the status moved to done", `| id | Item |\n|---|---|\n| relayer-follower | Relayer (experimental) and follower | done | framework | preview | alpha | none | \`a\` | wallets-keys | snag #784 blocks it |\n`, /not "building"/);
  caughtRow("notes that say the bugs were solved", row("Relayer (experimental) and follower", "snag #784 blocks it; its bugs were all solved"), /limits are gone/);
  caughtRow("two rows", `${row("Relayer (experimental) and follower", "snag #784 blocks it")}${row("Relayer and follower", "x")}`, /2 rows/);
  caughtRow("a row with a cell too few", `| relayer-follower | Relayer (experimental) | building | #784 |\n`, /cells, not 10/);

  const page = (rows: string) => `# chains\n\n## Status\n\n| Part | Status |\n|---|---|\n${rows}\n`;
  it("passes a page that does it right", () => expect(pageProblems(page("| the relayer: nonces, rebroadcast | experimental (#784) |\n| the follower | proved |"))).toEqual([]));
  const caughtPage = (name: string, text: string, expected: RegExp) => it(`catches ${name}`, () => expect(pageProblems(text).join("\n")).toMatch(expected));
  caughtPage("a page with no relayer", page("| the follower | proved |"), /does not mention the relayer/);
  caughtPage("the relayer's row without the word", page("| the relayer | proved |"), /no table row about the relayer says it is experimental/);
  caughtPage("the word in a sentence, not in a table row", `${page("| the relayer | proved |")}\nThe relayer is experimental.\n`, /no table row about the relayer says/);
  caughtPage("the word on the follower's row", page("| the relayer | proved |\n| the follower | experimental |"), /no table row about the relayer says/);
  caughtPage("a stale 'not written' row next to a good one", page("| the relayer | experimental |\n| the relayer and the follower | not written | planned |"), /still says it is not built/);
  caughtPage("a stale bullet that wraps, with 'come later' on its second line", `${page("| the relayer | experimental |")}\n- **Not the relayer or the follower.** One relayer actor that submits (M6.07) and one follower\n  that turns logs into events (M6.09) come later, on the same port.\n`, /still says it is not built/);
  caughtPage("D01 a bullet 'not yet written, to be done'", `${page("| the relayer | experimental (#784) |")}\n- **Not the relayer.** One relayer actor is not yet written; it is to be done in M6.07.\n`, /still says it is not built/);
  caughtPage("D02 'no longer experimental (#784 fixed)'", page("| the relayer | no longer experimental (#784 fixed) |"), /no table row about the relayer says|takes the marking back/);
  caughtPage("D03 the good row in an MDX comment", page("{/*\n| the relayer | experimental (#784) |\n*/}\n| the relayer | built, production-ready |"), /no table row about the relayer says/);
  caughtPage("D04 the good row in a code fence", `${page("| the relayer | built |")}\n\n\`\`\`\n| the relayer | experimental |\n\`\`\`\n`, /no table row about the relayer says/);
  caughtPage("P4 a sentence that the relayer is ready, its bugs solved", `${page("| the relayer | experimental (#784) |")}\nThe relayer is ready for production use; its bugs were all solved.\n`, /limits are gone/);
  caughtPage("P4' a row note that #784 is resolved", page("| the relayer | experimental (#784 resolved) |"), /limits are gone|takes the marking back/);
  caughtPage("a stale sentence 'come later'", `${page("| the relayer | experimental |")}\n- **Not the relayer.** One relayer actor comes later.\n`, /still says it is not built/);
});

// ---- (c) no live page says the suite is not run on main ----

export const STALE_README = /not (?:yet )?(?:be )?run on `?main`?|only on `?goal\/on-chain`?|until Goal 18's slice 9/i;
/** The README's line naming the job says it runs into `main` and on a push to `main`, and takes neither back. */
export const onChainReadmeSays = (l: string) => /into `main`/.test(l) && /push to `main`/.test(l) && !/\b(?:never|not|no longer)\b[^.;:]{0,40}`?main\b/i.test(l);

describe("(c) the judges are fair (planted lines)", () => {
  it("passes the right words", () => {
    expect(STALE_README.test("- **What the tests leave out:** The grid's reds live in a file.")).toBe(false);
    expect(onChainReadmeSays("- `nx run e2e:on-chain-ratchet` is what CI runs on every pull request into `main` or `goal/on-chain` and every push to `main` (job `e2e-on-chain`): green")).toBe(true);
  });
  it.each([
    "`e2e/on-chain` is not run on `main`, so its green files rest on their lists alone.",
    "CI runs that suite only on goal/on-chain, so its green files rest on their lists alone.",
    "kept, but CI runs that suite only on `goal/on-chain` until Goal 18's slice 9",
    "the suite is not yet run on main",
  ])("catches a stale dashboard line: %s", (l) => expect(STALE_README.test(l)).toBe(true));
  it.each([
    "- `nx run e2e:on-chain-ratchet` is what CI runs on every pull request into `goal/on-chain`, never on `main` (job `e2e-on-chain`)",
    "- `nx run e2e:on-chain-ratchet` is what CI runs on every pull request into `goal/on-chain` (job `e2e-on-chain`), not on `main`",
    "- runs on every pull request into `main` (job `e2e-on-chain`), and not on a push to `main`",
    "- runs on every push to `main` (job `e2e-on-chain`)",
  ])("catches an on-chain README line that does not say it: %s", (l) => expect(onChainReadmeSays(l)).toBe(false));
  it("reads past a comment: a stale line inside <!-- --> is not seen, and a good one there does not count", () => {
    expect(STALE_README.test(visible("<!-- not run on main -->\nok"))).toBe(false);
  });
});

describe("(c) no live page still says the on-chain suite is not run on main", () => {
  it("the climb counts it as run: `NOT_RUN_ON_MAIN` is empty", async () => {
    const climb = (await import(join(repo, "tools/github/climb.mjs"))) as { NOT_RUN_ON_MAIN?: unknown };
    expect(climb.NOT_RUN_ON_MAIN, "the suites the climb still marks not run on main, as the module exports them").toEqual([]);
  });
  it("the climb dashboard's README does not say the suite is not run on main", () => {
    const stale = STALE_README.test(visible(read("tools/github/climb-dashboard/README.md")));
    expect(stale, "tools/github/climb-dashboard/README.md still says the suite is not run on main").toBe(false);
  });
  it("e2e/on-chain's README says its CI job runs on main", () => {
    const lines = read("e2e/on-chain/README.md").split("\n").filter((l) => l.includes("e2e-on-chain"));
    expect(lines.length, "the README names the job").toBeGreaterThan(0);
    expect(lines.some((l) => onChainReadmeSays(l)), `the lines naming the job: ${lines.join(" / ")}`).toBe(true);
  });
});
