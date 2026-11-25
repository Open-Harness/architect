// What the staging workflow must be, judged from its text (M7.04). A pure function, so the same judge runs on the real file and on every planted wrong one (`workflow.test.mjs`). The
// workflow cannot run in a pull request (it deploys), so this is how its promises are checked before anyone starts it by hand: only by hand; destroy, the listing and the judgement
// always run; the credentials are two named values in the steps that need them and nowhere else; nothing prints the environment. It pins the file step by step, by id, on purpose: a check
// that lets a step be a no-op, a dry run or an `echo` would pass a workflow that deploys nothing, or one that never destroys. The lead changes a step by asking the author. Written by the checks author;
// a builder never edits it.
import { parse } from "yaml";
import { RUNS } from "./runs.mjs";

const TOKEN = "${{ secrets.CLOUDFLARE_API_TOKEN }}";
const ACCOUNT = "${{ vars.CLOUDFLARE_ACCOUNT_ID }}";
/** The account's workers.dev subdomain, for the story's address (check 41): an output of the `subdomain` step. The story step also holds the two credentials, exactly `up`'s expressions, to read the run's D1 databases (M7-04-story-reads-d1). */
const GUARD = "startsWith(github.ref, 'refs/heads/goal/')";
const REFUSED = "!startsWith(github.ref, 'refs/heads/goal/')";
const REFUSE_RUN = 'echo "::error::staging runs only from a goal branch (refs/heads/goal/...); this dispatch is on $REF"\nexit 1';
const SUBDOMAIN = "${{ steps.subdomain.outputs.subdomain }}";
/** Every `${{ }}` in the file, comments included, is one of these: there is no way to reach another secret, `toJSON(secrets)`, a token or an input. */
const EXPRESSIONS = new Set(["inputs.app", "github.run_id", "github.run_attempt", "steps.plan.outputs.prefix", "steps.up.outcome", "steps.story.outcome", "secrets.CLOUDFLARE_API_TOKEN", "vars.CLOUDFLARE_ACCOUNT_ID", "steps.subdomain.outputs.subdomain", "github.ref"]);
const USES = /^(actions\/checkout|pnpm\/action-setup|actions\/setup-node|actions\/upload-artifact)@v\d+\.\d+\.\d+$/;
/**
 * The only files the evidence upload may name (the repository is public, so anyone can download them): the plan, the story, the verdict, and the listings cut to the run's prefix. The whole-account
 * listings (`tmp/staging/private/`) hold every Worker, database, namespace and bucket of the account, other apps' included, and are never uploaded.
 */
const EVIDENCE = new Set(["tmp/staging/journeys.txt", "tmp/staging/plan.json", "tmp/staging/story.txt", "tmp/staging/verdict.txt", "tmp/staging/during-run.json", "tmp/staging/after-run.json"]);
const UPLOAD_WITH = ["name", "path", "if-no-files-found", "retention-days"];
/** An `if`, with its `${{ }}` taken off. */
const cond = (step) => (step.if === undefined ? undefined : String(step.if).replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/g, "").trim());
const CREDENTIALS = { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT };
const SNAPSHOT = (name) => `node e2e/staging/leftovers.mjs snapshot "$EVIDENCE/private/${name}.json"`;
const UPSTREAM = "steps.up.outcome == 'success'";

/** What each named step must be: its `if`, whether it continues on error, whether it holds the credentials, and its script (exactly, or a pattern for the story and the judge). */
const STEPS = [
  // The run the dispatch chose (CX-staging): its root into $GITHUB_ENV as ROOT, its journeys into a file. The only step that writes $GITHUB_ENV, and only what runs.mjs prints.
  { id: "select", env: { APP: "${{ inputs.app }}" }, run: 'mkdir -p "$EVIDENCE/private"\nnode e2e/staging/runs.mjs select "$APP" "$EVIDENCE/journeys.txt" >> "$GITHUB_ENV"' },
  { id: "plan", run: /^\$ORTHO env up staging --plan --run "\$RUN" --root "\$ROOT" > "\$EVIDENCE\/plan\.json"\necho "prefix=\$\(jq -r \.prefix "\$EVIDENCE\/plan\.json"\)" >> "\$GITHUB_OUTPUT"$/ },
  { id: "before", run: SNAPSHOT("before"), credentials: true },
  { id: "up", run: '$ORTHO env up staging --run "$RUN" --root "$ROOT"', credentials: true, continues: true },
  { id: "during", run: SNAPSHOT("during"), credentials: true, if: UPSTREAM },
  { id: "subdomain", run: 'node e2e/staging/subdomain.mjs "$GITHUB_OUTPUT"', credentials: true, if: UPSTREAM },
  { id: "story", run: 'only=(); while IFS= read -r name; do only+=(--only "$name"); done < "$EVIDENCE/journeys.txt"\ntest "${#only[@]}" -gt 0\n$ORTHO prove --env staging --run "$RUN" --root "$ROOT" "${only[@]}" 2>&1 | tee "$EVIDENCE/story.txt"; exit "${PIPESTATUS[0]}"', continues: true, if: UPSTREAM, env: { ORTHO_STAGING_SUBDOMAIN: SUBDOMAIN, ...CREDENTIALS } },
  { id: "destroy", run: '$ORTHO env destroy staging --run "$RUN" --root "$ROOT"', credentials: true, if: "always()" },
  { id: "after", run: SNAPSHOT("after"), credentials: true, if: "always()" },
  { id: "judge", if: "always()", env: { PREFIX: "${{ steps.plan.outputs.prefix }}", UP: "${{ steps.up.outcome }}" },
    run: /^args=\(--prefix "\$PREFIX" --after "\$EVIDENCE\/private\/after\.json" --before "\$EVIDENCE\/private\/before\.json"\)\nif \[ "\$UP" = success \]; then args\+=\(--during "\$EVIDENCE\/private\/during\.json" --plan "\$EVIDENCE\/plan\.json"\); fi\nnode e2e\/staging\/leftovers\.mjs judge "\$\{args\[@\]\}" 2>&1 \| tee "\$EVIDENCE\/verdict\.txt"; exit "\$\{PIPESTATUS\[0\]\}"$/ },
  { id: "evidence", if: "always()", env: { PREFIX: "${{ steps.plan.outputs.prefix }}" }, run: 'node e2e/staging/leftovers.mjs filter "$PREFIX" "$EVIDENCE/private" "$EVIDENCE"' },
  { id: undefined, name: "the final failure", if: "always() && (steps.up.outcome == 'failure' || steps.story.outcome == 'failure')", env: { UP: "${{ steps.up.outcome }}", STORY: "${{ steps.story.outcome }}" }, run: /^echo "::error::[^\n]*"\nexit 1$/ },
];

/** Everything wrong with the workflow in `source`: an empty list is a pass. */
export const problems = (source) => {
  let doc;
  try { doc = parse(source); } catch (error) { return [`not YAML: ${error.message}`]; }
  const out = [];
  const triggers = typeof doc?.on === "string" ? [doc.on] : Array.isArray(doc?.on) ? doc.on : Object.keys(doc?.on ?? {});
  if (triggers.length !== 1 || triggers[0] !== "workflow_dispatch") out.push(`it starts on ${JSON.stringify(triggers)}, and must start on workflow_dispatch alone (a deploy never starts itself)`);
  // One input, `app`: a choice of exactly the runs in runs.mjs, the first (Plugged In's story) by default. A choice, never free text: nothing typed at dispatch reaches a script (CX-staging).
  const inputs = doc?.on && typeof doc.on === "object" && !Array.isArray(doc.on) ? doc.on.workflow_dispatch?.inputs : undefined;
  const app = inputs?.app;
  const names = Object.keys(RUNS);
  if (inputs === undefined || inputs === null || Object.keys(inputs).length !== 1 || app === undefined) out.push(`workflow_dispatch takes exactly one input, app; it has ${JSON.stringify(Object.keys(inputs ?? {}))}`);
  else {
    if (app.type !== "choice" || JSON.stringify(app.options) !== JSON.stringify(names)) out.push(`the app input is not a choice of exactly ${names.join(", ")} (the runs in e2e/staging/runs.mjs), in that order`);
    if (app.default !== names[0] || app.required !== true) out.push(`the app input's default is ${JSON.stringify(app.default)} and it must be ${JSON.stringify(names[0])}, required: a dispatch with nothing chosen runs Plugged In's story, as before`);
    const extra = Object.keys(app).filter((k) => !["description", "type", "options", "default", "required"].includes(k));
    if (extra.length > 0) out.push(`the app input has ${extra.join(", ")}`);
  }
  const extra = Object.keys(doc ?? {}).filter((k) => !["name", "on", "permissions", "concurrency", "jobs"].includes(k));
  if (extra.length > 0) out.push(`the workflow has ${extra.join(", ")} at its top level: only name, on, permissions, concurrency and jobs (no env, defaults)`);
  if (JSON.stringify(doc?.permissions) !== JSON.stringify({ contents: "read" })) out.push("permissions are not exactly contents: read");
  if (doc?.concurrency?.["cancel-in-progress"] !== false || !doc?.concurrency?.group) out.push("runs are not serialised without cancelling (concurrency group, cancel-in-progress: false)");
  const jobs = Object.entries(doc?.jobs ?? {});
  if (jobs.length !== 2 || jobs[0][0] !== "refuse" || jobs[1][0] !== "staging") return [...out, `it has the jobs ${JSON.stringify(jobs.map(([k]) => k))}; it must be exactly "refuse" then "staging" (up, the story, destroy and the listing are one job; the other only refuses a dispatch off a goal branch)`];
  // The guard: staging runs only from a goal branch, and a dispatch anywhere else fails out loud (a skipped job would show nothing). `main` has no `ortho env`, and a run there would fail halfway with live credentials.
  const [[, refuse], [, job]] = jobs;
  if (job.if !== GUARD) out.push(`the staging job's \`if\` is ${JSON.stringify(job.if)}, and must be ${JSON.stringify(GUARD)} (a dispatch on main or any other ref must not deploy)`);
  if (refuse.if !== REFUSED) out.push(`the refuse job's \`if\` is ${JSON.stringify(refuse.if)}, and must be ${JSON.stringify(REFUSED)} (the opposite of the guard)`);
  const refuseSteps = refuse.steps ?? [];
  const refuseRun = String(refuseSteps[0]?.run ?? "").trim();
  if (refuseSteps.length !== 1 || refuseRun !== REFUSE_RUN) out.push(`the refuse job must be one step that says why with ::error:: naming the ref and exits 1`);
  if (JSON.stringify(refuseSteps[0]?.env ?? {}) !== JSON.stringify({ REF: "${{ github.ref }}" }) || JSON.stringify(refuse.env ?? {}) !== "{}") out.push("the refuse job holds only REF (the ref) in its step's env: no credential, no job env");
  if (refuse["runs-on"] !== "ubuntu-latest" || refuse.environment !== undefined || Object.keys(refuse).some((k) => !["if", "runs-on", "timeout-minutes", "steps"].includes(k))) out.push("the refuse job is only if, runs-on, timeout-minutes and steps: no environment (it must not reach the protected one), no checkout, no credential");
  const stray = Object.keys(job).filter((k) => !["if", "runs-on", "environment", "timeout-minutes", "env", "steps"].includes(k));
  if (stray.length > 0) out.push(`the job has ${stray.join(", ")}: only runs-on, environment, timeout-minutes, env and steps (no matrix, defaults, permissions; its one if is the goal-branch guard)`);
  if (job.environment !== "staging") out.push(`the job's environment is ${JSON.stringify(job.environment)}, and must be "staging": a protected environment, so the deploy can be limited to protected branches`);
  if (!Number.isInteger(job["timeout-minutes"]) || job["timeout-minutes"] < 1 || job["timeout-minutes"] > 60) out.push("the job has no timeout of 1 to 60 whole minutes");
  const jobEnv = JSON.stringify(job.env ?? {});
  if (jobEnv !== JSON.stringify({ RUN: "${{ github.run_id }}${{ github.run_attempt }}", ORTHO: "node packages/cli/src/main.ts", EVIDENCE: "tmp/staging" })) out.push("the job's env is not exactly RUN (the run id), ORTHO (the cli) and EVIDENCE (tmp/staging): no credential and no typed run belongs there");

  for (const [, body] of [...source.matchAll(/\$\{\{([\s\S]*?)\}\}/g)].map((m) => [m[0], m[1].trim()])) {
    if (!EXPRESSIONS.has(body)) out.push(`the expression \${{ ${body} }} is not one of the ${EXPRESSIONS.size} this workflow may use (the two credentials, the run id, the plan's prefix, two outcomes)`);
  }

  const steps = job.steps ?? [];
  const named = STEPS.map((want) => ({ want, at: steps.findIndex((s) => (want.id === undefined ? cond(s) === want.if : s.id === want.id)) }));
  for (const { want, at } of named) if (at < 0) out.push(`no step ${want.id === undefined ? want.name : `with id ${want.id}`}`);
  if (named.some((n) => n.at < 0)) return out;
  if (named.some((n, i) => i > 0 && n.at <= named[i - 1].at)) out.push(`the steps are not in the order ${STEPS.map((s) => s.id ?? "final failure").join(", ")}`);
  for (const { want, at } of named) {
    const step = steps[at], label = want.id ?? want.name;
    if (cond(step) !== want.if) out.push(`${label}: its \`if\` is ${JSON.stringify(cond(step))}, and must be ${JSON.stringify(want.if)}${want.if === "always()" ? " (a failed story must not leave the run's resources up)" : ""}`);
    if ((step["continue-on-error"] === true) !== (want.continues === true) || (step["continue-on-error"] !== undefined && step["continue-on-error"] !== true)) out.push(`${label}: continue-on-error is ${JSON.stringify(step["continue-on-error"])}, and must be ${want.continues ? "true: it may fail so that destroy runs" : "absent"}`);
    const run = String(step.run ?? "").trim().replace(/\n\s*/g, "\n");
    if (!(typeof want.run === "string" ? run === want.run : want.run.test(run))) out.push(`${label}: its script is not the one this check pins (${typeof want.run === "string" ? want.run : String(want.run).slice(0, 60)}...)`);
    const wantEnv = want.credentials ? CREDENTIALS : (want.env ?? {});
    if (JSON.stringify(Object.entries(step.env ?? {}).sort()) !== JSON.stringify(Object.entries(wantEnv).sort())) out.push(`${label}: its env is ${JSON.stringify(step.env ?? {})}; it must ${want.credentials ? "hold CLOUDFLARE_API_TOKEN from secrets and CLOUDFLARE_ACCOUNT_ID from vars, lacks neither" : want.env ? "be exactly " + JSON.stringify(want.env) : "hold no credential: the plan and the judgement run without one"}`);
    for (const key of Object.keys(step)) if (!["id", "name", "if", "continue-on-error", "run", "env"].includes(key)) out.push(`${label} has ${key}`);
  }

  // Everything else in the job: a fixed set of actions, no script that touches a credential or prints the environment, evidence that is named files.
  const known = new Set(named.map((n) => steps[n.at]));
  for (const s of steps.filter((x) => !known.has(x))) {
    if (s.uses === undefined && s.run === "pnpm install --frozen-lockfile" && Object.keys(s).length === 1) continue;
    if (!USES.test(s.uses ?? "")) { out.push(`${s.name ?? s.uses ?? "a step"} is not one of the four actions this workflow uses, at a pinned version`); continue; }
    if (/upload-artifact/.test(s.uses)) {
      const paths = String(s.with?.path ?? "").split("\n").map((p) => p.trim()).filter(Boolean);
      if (paths.length === 0 || paths.some((p) => !EVIDENCE.has(p)) || new Set(paths).size !== paths.length) out.push(`the evidence upload is not a list of only ${[...EVIDENCE].join(", ")}: no whole-account listing, no folder, no glob (the repository is public)`);
      for (const key of Object.keys(s.with ?? {})) if (!UPLOAD_WITH.includes(key)) out.push(`the evidence upload sets ${key}: only ${UPLOAD_WITH.join(", ")}`);
      if (s.with?.["retention-days"] !== 7) out.push("the evidence upload does not keep for 7 days (retention-days: 7)");
      if (cond(s) !== "always()") out.push("the evidence upload does not run `if: always()`");
    } else if (s.run !== undefined || s.env !== undefined || s["continue-on-error"] !== undefined || s.shell !== undefined) out.push(`${s.uses} carries a script, env or continue-on-error`);
  }
  if (!steps.some((s) => /\bupload-artifact/.test(s.uses ?? ""))) out.push("the evidence is not uploaded");
  steps.forEach((s, i) => {
    const label = s.id ?? s.name ?? `step ${i}`;
    if (s.shell !== undefined || s["working-directory"] !== undefined) out.push(`${label} sets a shell or a directory`);
    if (s.id !== "select" && /GITHUB_ENV|GITHUB_PATH/.test(String(s.run ?? ""))) out.push(`${label} writes $GITHUB_ENV or $GITHUB_PATH: only select sets the job's environment, and only to ROOT`);
    if (/\bCLOUDFLARE_|\bsecrets\b|\bvars\b|\bset -[a-z]*x|\bset [-+]o\b|\bset \+e|\bprintenv\b|(^|[\s;|&])env\s*($|[|;&>])|\bexport\b|\bcompgen\b|\bdeclare\b|process\.env|\/proc\/|\bbash -|\bsh -|\|\| *(true|:)|\bexit 0\b|\btoJSON\b/m.test(s.run ?? "")) out.push(`${label}'s script touches a credential, can print the environment or hides a failure`);
  });
  for (const s of steps) if (/ortho-[a-z0-9]+-[a-z]+-|\bstg\b/.test(s.run ?? "")) out.push(`${s.id ?? s.name ?? "a step"} types a prefix: it must come from the plan's prefix`);
  return [...out, ...shape(source)];
};

// ---- the run's shape when a step fails (CX-staging, check 5): one up, one destroy, whatever fails ----

/**
 * A step's `if`, evaluated as GitHub does for the expressions this workflow may hold: `always()`, `success()`, `failure()`, `cancelled()`, `steps.<id>.outcome`, quoted strings, `==`, `!=`, `!`,
 * `&&`, `||` and parentheses. An `if` with no status function is `success() && (<if>)`, and no `if` is `success()`. Anything else throws: a condition the walk cannot read is not a pass.
 */
export const evaluate = (text, { failed, outcomes }) => {
  const source = text === undefined ? "success()" : text;
  const tokens = source.match(/\s*(\|\||&&|==|!=|!|\(|\)|'[^']*'|[A-Za-z_][\w.-]*\(\)|[A-Za-z_][\w.-]*)/gy)?.map((t) => t.trim()) ?? [];
  if (tokens.join("").length !== source.replace(/\s/g, "").length) throw new Error(`cannot read the condition ${JSON.stringify(source)}`);
  let at = 0;
  const peek = () => tokens[at];
  const take = (want) => { if (want !== undefined && tokens[at] !== want) throw new Error(`expected ${want} in ${JSON.stringify(source)}`); return tokens[at++]; };
  const value = () => {
    const t = take();
    if (t === "(") { const v = or(); take(")"); return v; }
    if (t === "!") return !truthy(value());
    if (t === "always()") return true;
    if (t === "success()") return !failed;
    if (t === "failure()") return failed;
    if (t === "cancelled()") return false;
    if (t === "true" || t === "false") return t === "true";
    if (t?.startsWith("'")) return t.slice(1, -1);
    const m = /^steps\.([\w-]+)\.outcome$/.exec(t ?? "");
    if (m) return outcomes.get(m[1]) ?? null;
    throw new Error(`cannot read ${JSON.stringify(t)} in ${JSON.stringify(source)}`);
  };
  const truthy = (v) => v !== false && v !== null && v !== "" && v !== 0;
  const compare = () => {
    let v = value();
    while (peek() === "==" || peek() === "!=") { const op = take(); const w = value(); v = op === "==" ? v === w : v !== w; }
    return v;
  };
  const and = () => { let v = compare(); while (peek() === "&&") { take(); const w = compare(); v = truthy(v) && truthy(w); } return v; };
  const or = () => { let v = and(); while (peek() === "||") { take(); const w = and(); v = truthy(v) || truthy(w); } return v; };
  const result = or();
  if (at !== tokens.length) throw new Error(`cannot read the condition ${JSON.stringify(source)}`);
  return /\b(always|success|failure|cancelled)\(\)/.test(source) ? truthy(result) : !failed && truthy(result);
};

/** The staging job's steps as GitHub would take them when the steps in `failing` (by id) fail: which ran, which made or deleted cloud resources, and whether the job failed. */
export const walk = (source, failing = new Set()) => {
  const job = parse(source)?.jobs?.staging;
  const outcomes = new Map();
  const ran = [], taken = [];
  let failed = false;
  for (const step of job?.steps ?? []) {
    if (!evaluate(cond(step), { failed, outcomes })) { if (step.id) outcomes.set(step.id, "skipped"); continue; }
    const run = String(step.run ?? "");
    const fails = failing.has(step.id) || /(^|\n)\s*exit 1\s*$/.test(run.trim());
    ran.push(step.id ?? step.name ?? step.uses ?? run.trim());
    taken.push(step);
    if (step.id) outcomes.set(step.id, fails ? "failure" : "success");
    if (fails && step["continue-on-error"] !== true) failed = true;
  }
  const count = (re) => taken.filter((s) => re.test(String(s.run ?? ""))).length;
  return { ran, failed, ups: count(/\benv up staging (?![^\n]*--plan)/), destroys: count(/\benv destroy staging\b/), proves: count(/\bprove --env staging\b/) };
};

/** The steps a run can fail at: every step before the upload. */
const FAIL_AT = ["select", "plan", "before", "up", "during", "subdomain", "story", "destroy", "after", "judge", "evidence"];

/** Everything wrong with the run's shape: whatever one step fails, up runs at most once (and never after the plan or the first listing failed), destroy runs exactly once, and the job fails. */
export const shape = (source) => {
  const out = [];
  try {
    const clean = walk(source);
    if (clean.failed || clean.ups !== 1 || clean.destroys !== 1 || clean.proves !== 1) out.push(`a run where nothing fails must pass with one up, one story and one destroy; it ${clean.failed ? "failed" : "passed"} with ${clean.ups} up, ${clean.proves} story, ${clean.destroys} destroy`);
    for (const at of FAIL_AT) {
      const w = walk(source, new Set([at]));
      if (w.destroys !== 1) out.push(`when ${at} fails, destroy runs ${w.destroys} times: it must run once, so a run that fails part way still destroys`);
      if (w.ups > 1) out.push(`when ${at} fails, up runs ${w.ups} times: one up per run`);
      if (["select", "plan", "before"].includes(at) && w.ups !== 0) out.push(`when ${at} fails, up still runs: nothing is made before the plan and the first listing are in hand`);
      if (!w.failed) out.push(`when ${at} fails, the job passes: a failure anywhere fails the run`);
    }
  } catch (error) { out.push(`the run's shape cannot be read: ${error.message}`); }
  return out;
};
