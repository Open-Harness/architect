// Check 48 (Goal 18, slice 9, #1067: the chain basics in the alpha). Written by the author before the build; a builder never edits it (AGENTS.md, "Journeys and checks come first").
// What it states, in the words of design/goals/18-framework.md slice 9 and K44 section 2, call 4 ("the chain basics are in the alpha"):
//  (a) THE ON-CHAIN SUITE RUNS ON `main`. CI's `e2e-on-chain` job (.github/workflows/ci.yml) runs `nx run e2e:on-chain-ratchet`, the ratchet over e2e/on-chain (keys' and wallets' journeys
//      through money, the relayer and the follower), with Anvil and full history, on every ready pull request into `main` and on every push to `main`, as it does for `goal/on-chain`; a docs-only
//      run passes without its steps. The job's own `if` and its `env.SKIP` decide that, so they are read here and evaluated, for each event, with the small part of GitHub's expression language
//      the workflow uses (the evaluator is at the top of this file, and is tested against planted expressions). A step that must run and doesn't, or runs without Anvil, is as red as a job that skips.
//  (b) THE RELAYER IS MARKED EXPERIMENTAL, where a person meets it. The slice says "fixed or marked experimental" (#784); the author's call, on the evidence (the three bugs are in main today: a first
//      receipt is final in relayer/internal/check.ts, a fill is broadcast before it is stored, a resumed EIP-1559 transaction drops its access list in chain-evm's tx/internal/sign.ts; each needs
//      a reorg world, a restart between two writes, or a signed access list that no journey in the alpha has; no app pulls the relayer, K44 call 5) is: MARK IT, and keep #784 open for the app
//      that first pulls it. So: the relayer module's README opens with the word and the three limits, the class's own doc comment (what an editor shows on hover) carries `@experimental` and #784,
//      the canon's chains-and-wallets page says it where it lists what is built (and stops saying the relayer is "not written"), and the status page's row names it in its item. The marking is
//      judged by what a reader of each place sees, not by one string anywhere in the file (the judges are tested against planted wrong files below).
//  (c) NO LIVE PAGE STILL SAYS THE SUITE IS NOT RUN ON `main`: the climb's `NOT_RUN_ON_MAIN` is empty, its dashboard README says nothing of it, and e2e/on-chain's README says its job runs on `main`.
// The marking is the slice's only claim about #784. A builder who instead fixes the three bugs has to change this check's author first (they are the same slice: the author then pins each bug with
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
    if (typeof at !== "object" || at === null || !(key in at)) return null;
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
export interface Scenario { readonly name: string; readonly event: "pull_request" | "push"; readonly base?: string; readonly ref?: string; readonly docsOnly: boolean }

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
      changes: { result: "success", outputs: { docs_only: String(s.docsOnly), affected_prove: String(!s.docsOnly) } },
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

const CASES = {
  prMain: { name: "a pull request into main", event: "pull_request", base: "main", docsOnly: false },
  pushMain: { name: "a push to main", event: "push", ref: "refs/heads/main", docsOnly: false },
  prGoal: { name: "a pull request into goal/on-chain", event: "pull_request", base: "goal/on-chain", docsOnly: false },
  pushGoal: { name: "a push to goal/on-chain", event: "push", ref: "refs/heads/goal/on-chain", docsOnly: false },
  docsMain: { name: "a docs-only pull request into main", event: "pull_request", base: "main", docsOnly: true },
  docsPushMain: { name: "a docs-only push to main", event: "push", ref: "refs/heads/main", docsOnly: true },
  docsGoal: { name: "a docs-only pull request into goal/on-chain", event: "pull_request", base: "goal/on-chain", docsOnly: true },
} as const satisfies Record<string, Scenario>;

/** The verdict on a workflow: for each event, what must happen. One line per way it is wrong. */
export const workflowProblems = (workflow: Json): ReadonlyArray<string> => {
  const out: string[] = [];
  for (const c of [CASES.prMain, CASES.pushMain, CASES.prGoal, CASES.pushGoal]) out.push(...problemsOf(stepsThatRun(workflow, c)).map((p) => `${c.name}: ${p}`));
  for (const c of [CASES.docsMain, CASES.docsPushMain, CASES.docsGoal]) {
    const steps = stepsThatRun(workflow, c);
    if (steps !== undefined && steps.some((step) => typeof step.run === "string" && step.run.includes(RATCHET))) out.push(`${c.name}: the ratchet runs, and a docs-only run passes without its steps`);
  }
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
    expect(evaluate("needs.nothing.outputs.here == 'x'", ctx)).toBe(false);
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
    expect(() => evaluate("(github.base_ref == 'main'", ctx)).toThrow();
    expect(() => evaluate("github.base_ref == 'main' )", ctx)).toThrow();
  });
});

describe("(a) the on-chain suite runs on main: the job `e2e-on-chain` in .github/workflows/ci.yml", () => {
  const workflow = ci();
  const decide = (c: Scenario) => problemsOf(stepsThatRun(workflow, c));
  it("runs the ratchet, with Anvil and the whole history, on a pull request into main", () => {
    expect(decide(CASES.prMain), "the job's steps for a pull request into main").toEqual([]);
  });
  it("runs it on a push to main", () => {
    expect(decide(CASES.pushMain), "the job's steps for a push to main").toEqual([]);
  });
  it("still runs it for the goal's own branch (a pull request into goal/on-chain, a push to it)", () => {
    expect(decide(CASES.prGoal), "pull request into goal/on-chain").toEqual([]);
    expect(decide(CASES.pushGoal), "push to goal/on-chain").toEqual([]);
  });
  it("passes without its steps on a docs-only run, for main and for goal/on-chain", () => {
    for (const c of [CASES.docsMain, CASES.docsPushMain, CASES.docsGoal]) {
      const steps = stepsThatRun(workflow, c);
      expect(steps?.filter((step) => typeof step.run === "string" && step.run.includes(RATCHET)) ?? [], c.name).toEqual([]);
    }
  });
  it("is run by a workflow that runs on a push to main and on pull requests", () => {
    expect(workflowProblems(workflow).filter((p) => p.startsWith("the workflow"))).toEqual([]);
  });
  it("has the whole verdict empty: no event, no step, no condition is wrong", () => {
    expect(workflowProblems(workflow)).toEqual([]);
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
  caught("a job that never skips (a docs-only run runs the ratchet)", small("false"), /docs-only .*: the ratchet runs/);
  caught("a job that always skips", small("true"), /a pull request into main: the job does not|a pull request into main: no step/);
  caught("a job that skips docs-only on main but runs the ratchet on a docs-only pull request into goal/on-chain", small("!(github.ref == 'refs/heads/main' || (github.event_name == 'pull_request' && (github.base_ref == 'main' || github.base_ref == 'goal/on-chain')) || github.ref == 'refs/heads/goal/on-chain') || (needs.changes.result == 'success' && needs.changes.outputs.docs_only == 'true' && github.base_ref == 'main')"), /docs-only pull request into goal\/on-chain: the ratchet runs/);
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
  it("does not mind a different way of saying the same (a `contains`, a `startsWith`, the 'main' kept in a list)", () => {
    const other = "!(contains('main,goal/on-chain', github.base_ref) && github.event_name == 'pull_request' || startsWith(github.ref, 'refs/heads/') && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/goal/on-chain')) || needs.changes.outputs.docs_only == 'true'";
    expect(workflowProblems(small(other))).toEqual([]);
  });
});

// ---- (b) the relayer is marked experimental, where a person meets it ----

/** `experimental`, said of the thing and not denied. */
const SAYS = /(?<!\bnot\s)(?<!\bno\s)(?<!\bnon-)(?<!\bun)\bexperimental\b/i;
export const says = (s: string) => SAYS.test(s);

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
/** The three limits #784 names, each by what a reader would look for. */
export const LIMITS: ReadonlyArray<readonly [string, RegExp]> = [
  ["a first receipt is final, so a reorg is missed", /\breorg/i],
  ["a fill is sent before it is stored, so a restart may sign a second transaction at one nonce", /\b(?:fill|fills)\b[\s\S]{0,200}\b(?:restart|before it is stored|before it is saved)\b|\b(?:restart|before it is stored)\b[\s\S]{0,200}\b(?:fill|fills)\b/i],
  ["a resumed transaction drops its access list", /access list/i],
];
export const readmeProblems = (readme: string): ReadonlyArray<string> => {
  const block = `${opening(readme)}\n${sectionsNamingIt(readme)}`;
  const out: string[] = [];
  if (!says(opening(readme))) out.push("the README's opening does not say the relayer is experimental");
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
  const doc = docOf(source, "Relayer");
  const out: string[] = [];
  if (doc === "") out.push("`export class Relayer` has no doc comment right above it");
  if (!/^\s*\*\s*@experimental\b/m.test(doc)) out.push("the Relayer's doc comment has no `@experimental` tag");
  if (!/#784\b/.test(doc)) out.push("the Relayer's doc comment does not name #784");
  return out;
};

/** The canon page: the lines about the relayer (a table row or a sentence) say it is experimental, and none says it is not written or comes later. */
export const pageProblems = (page: string): ReadonlyArray<string> => {
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
  if (!lines.some((l) => /^\|/.test(l) && says(l))) out.push("no table row about the relayer says it is experimental");
  for (const l of lines) if (/not written|come later|comes later|\bplanned\b|not built|not yet built/i.test(l)) out.push(`a line about the relayer still says it is not built: ${l.trim().slice(0, 90)}`);
  return out;
};

/** The status page's row for the relayer and the follower: its item says experimental, its notes name #784, and it stays in the alpha. */
export const rowProblems = (status: string): ReadonlyArray<string> => {
  const row = status.split("\n").find((l) => /^\|\s*relayer-follower\s*\|/.test(l));
  if (row === undefined) return ["the status page has no row `relayer-follower`"];
  const cells = row.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
  const out: string[] = [];
  if (cells.length !== 10) out.push(`the row has ${cells.length} cells, not 10`);
  const [, item = "", , , release = "", milestone = ""] = cells;
  const notes = cells.at(-1) ?? "";
  if (!says(item)) out.push("the row's item does not say experimental");
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
  it("opens its module README with the word, #784 and the three limits", () => {
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
  const readme = (extra: string, limits = "A first receipt is final, so a reorg is missed (#784); a fill is sent before it is stored, so a restart may sign a second transaction at one nonce; a resumed transaction drops its access list.") =>
    `# relayer\n\n**Experimental** in the alpha. ${limits}${extra}\n\n| Method | What it does |\n|---|---|\n| \`relay\` | sends |\n\nLater paragraphs.\n`;
  it("passes a README that does it right", () => expect(readmeProblems(readme(""))).toEqual([]));
  it("passes the limits in a section headed with the word, when the opening says it", () => {
    const text = `# relayer\n\nExperimental, see #784.\n\n## Experimental: what is wrong\n\nA reorg is missed; a fill before it is stored and a restart; an access list is dropped.\n\n| a |\n`;
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
  caughtReadme("the limits only far below the opening", `# relayer\n\nExperimental, #784.\n\n| a |\n|---|\n\nA reorg is missed; a fill before a restart; an access list is dropped.\n`, /does not say: a first receipt/);

  const service = (doc: string, name = "Relayer") => `import x from "y";\n\n${doc}\nexport class ${name} extends DurableObject {}\n`;
  const GOOD_DOC = "/**\n * The relayer's Durable Object.\n *\n * @experimental Three bugs are open (#784).\n */";
  it("passes a doc comment that does it right", () => expect(docProblems(service(GOOD_DOC))).toEqual([]));
  const caughtDoc = (name: string, text: string, expected: RegExp) => it(`catches ${name}`, () => expect(docProblems(text).join("\n")).toMatch(expected));
  caughtDoc("no doc comment", service(""), /has no doc comment/);
  caughtDoc("a line comment, not a doc comment", service("// @experimental #784"), /has no doc comment/);
  caughtDoc("a doc comment without the tag", service("/**\n * Experimental (#784).\n */"), /no `@experimental` tag/);
  caughtDoc("the tag in the middle of a sentence, not as a tag", service("/**\n * Use @experimental sparingly (#784).\n */"), /no `@experimental` tag/);
  caughtDoc("the tag with no issue", service("/**\n * @experimental\n */"), /does not name #784/);
  caughtDoc("the tag on the follower and not the relayer", `${service(GOOD_DOC, "Follower")}\n${service("/** The relayer. */")}`, /no `@experimental` tag/);
  caughtDoc("a comment with another statement between it and the class", `${GOOD_DOC}\nconst x = 1;\nexport class Relayer {}\n`, /has no doc comment/);

  const row = (item: string, notes: string, release = "preview", milestone = "alpha") =>
    `| id | Item |\n|---|---|\n| relayer-follower | ${item} | building | framework | ${release} | ${milestone} | none | \`a\` | wallets-keys | ${notes} |\n`;
  it("passes a row that does it right", () => expect(rowProblems(row("Relayer (experimental) and follower: both actors are on `main`", "snag #784 is open"))).toEqual([]));
  const caughtRow = (name: string, text: string, expected: RegExp) => it(`catches ${name}`, () => expect(rowProblems(text).join("\n")).toMatch(expected));
  caughtRow("an item that does not say it", row("Relayer and follower", "experimental, #784"), /item does not say experimental/);
  caughtRow("'not experimental'", row("Relayer and follower, not experimental", "#784"), /item does not say experimental/);
  caughtRow("the word in the notes only", row("Relayer and follower", "the relayer is experimental, #784"), /item does not say experimental/);
  caughtRow("an item that marks the follower and not the relayer", row("Follower (experimental)", "#784"), /does not name the relayer/);
  caughtRow("no #784 in the notes", row("Relayer (experimental) and follower", "snag open"), /do not name #784/);
  caughtRow("a row that leaves the alpha", row("Relayer (experimental) and follower", "#784", "1.0", "getting paid"), /leaves the alpha/);
  caughtRow("a row that is gone", `| id |\n|---|\n| other | a |\n`, /no row `relayer-follower`/);
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
  caughtPage("a stale sentence 'come later'", `${page("| the relayer | experimental |")}\n- **Not the relayer.** One relayer actor comes later.\n`, /still says it is not built/);
});

// ---- (c) no live page says the suite is not run on main ----

describe("(c) no live page still says the on-chain suite is not run on main", () => {
  it("the climb counts it as run: `NOT_RUN_ON_MAIN` is empty", () => {
    const m = /export const NOT_RUN_ON_MAIN\s*=\s*\[([^\]]*)\]/.exec(read("tools/github/climb.mjs"));
    expect(m, "tools/github/climb.mjs declares NOT_RUN_ON_MAIN").not.toBeNull();
    expect(m?.[1]?.trim(), "the suites the climb still marks not run on main").toBe("");
  });
  it("the climb dashboard's README does not say the suite is not run on main", () => {
    const stale = /CI runs that suite only on `goal\/on-chain`|not run on main/i.test(read("tools/github/climb-dashboard/README.md"));
    expect(stale, "tools/github/climb-dashboard/README.md still says the suite is not run on main").toBe(false);
  });
  it("e2e/on-chain's README says its CI job runs on main", () => {
    const lines = read("e2e/on-chain/README.md").split("\n").filter((l) => l.includes("e2e-on-chain"));
    expect(lines.length, "the README names the job").toBeGreaterThan(0);
    expect(lines.some((l) => /\bmain\b/.test(l)), `the lines naming the job: ${lines.join(" / ")}`).toBe(true);
  });
});
