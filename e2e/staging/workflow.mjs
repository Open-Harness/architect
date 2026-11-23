// What the staging workflow must be, judged from its text (M7.04). A pure function, so the same judge runs on the real file and on every planted wrong one (`workflow.test.mjs`). The
// workflow cannot run in a pull request (it deploys), so this is how its promises are checked before anyone starts it by hand: only by hand; destroy, the listing and the judgement
// always run; the credentials are two named values in the steps that need them and nowhere else; nothing prints the environment. It pins the file step by step, by id, on purpose: a check
// that lets a step be a no-op, a dry run or an `echo` would pass a workflow that deploys nothing, or one that never destroys. The lead changes a step by asking the author. Written by the checks author;
// a builder never edits it.
import { parse } from "yaml";

const TOKEN = "${{ secrets.CLOUDFLARE_API_TOKEN }}";
const ACCOUNT = "${{ vars.CLOUDFLARE_ACCOUNT_ID }}";
/** The account's workers.dev subdomain, for the story's address (check 41): an output of the `subdomain` step. The story step also holds the two credentials, exactly `up`'s expressions, to read the run's D1 databases (M7-04-story-reads-d1). */
const GUARD = "startsWith(github.ref, 'refs/heads/goal/')";
const REFUSED = "!startsWith(github.ref, 'refs/heads/goal/')";
const REFUSE_RUN = 'echo "::error::staging runs only from a goal branch (refs/heads/goal/...); this dispatch is on $REF"\nexit 1';
const SUBDOMAIN = "${{ steps.subdomain.outputs.subdomain }}";
/** Every `${{ }}` in the file, comments included, is one of these: there is no way to reach another secret, `toJSON(secrets)`, a token or an input. */
const EXPRESSIONS = new Set(["github.run_id", "github.run_attempt", "steps.plan.outputs.prefix", "steps.up.outcome", "steps.story.outcome", "secrets.CLOUDFLARE_API_TOKEN", "vars.CLOUDFLARE_ACCOUNT_ID", "steps.subdomain.outputs.subdomain", "github.ref"]);
const USES = /^(actions\/checkout|pnpm\/action-setup|actions\/setup-node|actions\/upload-artifact)@v\d+\.\d+\.\d+$/;
/**
 * The only files the evidence upload may name (the repository is public, so anyone can download them): the plan, the story, the verdict, and the listings cut to the run's prefix. The whole-account
 * listings (`tmp/staging/private/`) hold every Worker, database, namespace and bucket of the account, other apps' included, and are never uploaded.
 */
const EVIDENCE = new Set(["tmp/staging/plan.json", "tmp/staging/story.txt", "tmp/staging/verdict.txt", "tmp/staging/during-run.json", "tmp/staging/after-run.json"]);
const UPLOAD_WITH = ["name", "path", "if-no-files-found", "retention-days"];
/** An `if`, with its `${{ }}` taken off. */
const cond = (step) => (step.if === undefined ? undefined : String(step.if).replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/g, "").trim());
const CREDENTIALS = { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT };
const SNAPSHOT = (name) => `node e2e/staging/leftovers.mjs snapshot "$EVIDENCE/private/${name}.json"`;
const UPSTREAM = "steps.up.outcome == 'success'";

/** What each named step must be: its `if`, whether it continues on error, whether it holds the credentials, and its script (exactly, or a pattern for the story and the judge). */
const STEPS = [
  { id: "plan", run: /^mkdir -p "\$EVIDENCE\/private"\n\$ORTHO env up staging --plan --run "\$RUN" --root examples\/plugged-in > "\$EVIDENCE\/plan\.json"\necho "prefix=\$\(jq -r \.prefix "\$EVIDENCE\/plan\.json"\)" >> "\$GITHUB_OUTPUT"$/ },
  { id: "before", run: SNAPSHOT("before"), credentials: true },
  { id: "up", run: '$ORTHO env up staging --run "$RUN" --root examples/plugged-in', credentials: true, continues: true },
  { id: "during", run: SNAPSHOT("during"), credentials: true, if: UPSTREAM },
  { id: "subdomain", run: 'node e2e/staging/subdomain.mjs "$GITHUB_OUTPUT"', credentials: true, if: UPSTREAM },
  { id: "story", run: /^\$ORTHO prove --env staging --run "\$RUN" --root examples\/plugged-in [^\n|;&]* 2>&1 \| tee "\$EVIDENCE\/story\.txt"; exit "\$\{PIPESTATUS\[0\]\}"$/, continues: true, if: UPSTREAM, env: { ORTHO_STAGING_SUBDOMAIN: SUBDOMAIN, ...CREDENTIALS } },
  { id: "destroy", run: '$ORTHO env destroy staging --run "$RUN" --root examples/plugged-in', credentials: true, if: "always()" },
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
  if (doc?.on && typeof doc.on === "object" && !Array.isArray(doc.on) && doc.on.workflow_dispatch?.inputs !== undefined) out.push("workflow_dispatch takes no inputs: the run is named by its id");
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
    if (/\bCLOUDFLARE_|\bsecrets\b|\bvars\b|\bset -[a-z]*x|\bset [-+]o\b|\bset \+e|\bprintenv\b|(^|[\s;|&])env\s*($|[|;&>])|\bexport\b|\bcompgen\b|\bdeclare\b|process\.env|\/proc\/|\bbash -|\bsh -|\|\| *(true|:)|\bexit 0\b|\btoJSON\b/m.test(s.run ?? "")) out.push(`${label}'s script touches a credential, can print the environment or hides a failure`);
  });
  for (const s of steps) if (/ortho-[a-z0-9]+-[a-z]+-|\bstg\b/.test(s.run ?? "")) out.push(`${s.id ?? s.name ?? "a step"} types a prefix: it must come from the plan's prefix`);
  return out;
};
