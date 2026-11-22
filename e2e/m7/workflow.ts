// What the test-worlds workflow must be, judged from its text (M7.05). A pure function, so the same judge runs on the real file and on every planted wrong one
// (`01-test-worlds-workflow.test.ts`). The workflow cannot run in a pull request of this repository's own checks (it makes a world on Cloudflare), so this is how its promises are checked before the
// first real run: one job, only for pull requests from this repository, nothing made without the two credentials or past the day's cap, the world destroyed and the account listed whatever happened,
// the verdicts signed with the job's own GitHub token and never with a token a person or a script supplies. Written by the checks author; a builder never edits it.
// It pins the file by step id, on purpose (the way e2e/staging/workflow.mjs does): a step that is a dry run, an `echo` or `|| true` would pass a workflow that makes nothing or never destroys.
import { parse } from "yaml";

export const PATH = ".github/workflows/test-worlds.yml";
export const CAP = 20;
const TOKEN = "${{ secrets.CLOUDFLARE_API_TOKEN }}";
const ACCOUNT = "${{ vars.CLOUDFLARE_ACCOUNT_ID }}";
const CREDENTIALS = { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT };
/** The run id: the pull request's number and the run (with its attempt) in it, so two runs of one pull request, and two pull requests, never share a prefix. */
export const RUN = "pr${{ github.event.pull_request.number }}r${{ github.run_id }}${{ github.run_attempt }}";
/** Only this repository's own, ready pull requests: a fork gets no secrets and no id token, and a draft runs no CI (design/decisions/CI-drafts.md). */
export const GUARD = "github.event.pull_request.draft != true && github.event.pull_request.head.repo.full_name == github.repository";
/** Nothing is made unless the credentials are there and the day's cap holds, and the steps that clean up run only then (there is nothing to clean up before). */
const GATE = "steps.credentials.outcome == 'success' && steps.cap.outcome == 'success'";
const ALWAYS = `always() && ${GATE}`;
const EXPRESSIONS = new Set([
  "github.event.pull_request.number", "github.run_id", "github.run_attempt", "github.token", "github.repository", "github.event.pull_request.head.repo.full_name",
  "secrets.CLOUDFLARE_API_TOKEN", "vars.CLOUDFLARE_ACCOUNT_ID",
]);
const STEP_EXPRESSION = /^steps\.[a-z]+\.(outputs\.[a-z]+|outcome)$/;
const USES = /^(actions\/checkout|pnpm\/action-setup|actions\/setup-node|actions\/upload-artifact)@v\d+\.\d+\.\d+$/;
/** What the evidence upload may name (the repository is public): the plan, what prove said, the verdict, and the listings cut to the run's prefix. Never a whole-account listing. */
const EVIDENCE = new Set(["tmp/test-worlds/plan.json", "tmp/test-worlds/prove.txt", "tmp/test-worlds/verdict.txt", "tmp/test-worlds/during-run.json", "tmp/test-worlds/after-run.json"]);
const SNAPSHOT = (name: string) => `node e2e/staging/leftovers.mjs snapshot "$EVIDENCE/private/${name}.json"`;
const cond = (step: Step) => (step.if === undefined ? undefined : String(step.if).replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/g, "").trim());

type Step = Record<string, unknown> & { id?: string; name?: string; if?: unknown; run?: string; uses?: string; env?: Record<string, string>; with?: Record<string, unknown> };
interface Want { readonly id: string; readonly if?: string; readonly name?: string; readonly continues?: boolean; readonly run?: string | RegExp; readonly env: Record<string, string> | "prove" | "logbook" }

/** What each named step must be, in order. `credentials` and `prove` are judged by what they do and by their shape; the others are pinned. */
const STEPS: ReadonlyArray<Want> = [
  { id: "credentials", env: CREDENTIALS },
  // The step's name is what GitHub's jobs API shows, and the cap counts runs by it (check 04): a run whose job got past a step called `cap` made a world.
  { id: "cap", name: "cap", env: { GH_TOKEN: "${{ github.token }}", WORKFLOW_FILE: "test-worlds.yml" }, run: "node tools/release/world-cap.mjs" },
  { id: "plan", env: {}, run: /^mkdir -p "\$EVIDENCE\/private"\n\$ORTHO env up test --plan --run "\$RUN" --root examples\/plugged-in > "\$EVIDENCE\/plan\.json"\necho "prefix=\$\(jq -r \.prefix "\$EVIDENCE\/plan\.json"\)" >> "\$GITHUB_OUTPUT"$/ },
  { id: "up", env: CREDENTIALS, continues: true, run: '$ORTHO env up test --run "$RUN" --root examples/plugged-in' },
  // The listing taken while the world is up, before the logbook: what `judge` compares with the plan (up made what the plan said). Scoped to the run by the judge, like the others.
  { id: "during", env: CREDENTIALS, if: "steps.up.outcome == 'success'", run: SNAPSHOT("during") },
  // The logbook is stood up for this run and destroyed with its world (decided by the Goal 15 lead): a step of the run's own, under the run's prefix, after the world is up and before prove. Nothing long-lived.
  { id: "logbook", env: CREDENTIALS, continues: true, if: "steps.up.outcome == 'success'", run: /^\$ORTHO env up logbook --run "\$RUN" --root examples\/plugged-in( >> "\$GITHUB_OUTPUT")?$/ },
  { id: "prove", env: "prove", continues: true, if: "steps.up.outcome == 'success'", run: /^\$ORTHO prove --env test --root examples\/plugged-in( --only "[A-Za-z0-9 ]+")? 2>&1 \| tee "\$EVIDENCE\/prove\.txt"; exit "\$\{PIPESTATUS\[0\]\}"$/ },
  { id: "destroy", env: CREDENTIALS, if: ALWAYS, run: '$ORTHO env destroy test --run "$RUN" --root examples/plugged-in' },
  // The run's own logbook goes with its world, whatever happened (the lead's call, #500): it is its own environment, so its own step.
  { id: "destroy-logbook", env: CREDENTIALS, if: ALWAYS, run: '$ORTHO env destroy logbook --run "$RUN" --root examples/plugged-in' },
  { id: "after", env: CREDENTIALS, if: ALWAYS, run: SNAPSHOT("after") },
  { id: "judge", if: ALWAYS, env: { PREFIX: "${{ steps.plan.outputs.prefix }}", UP: "${{ steps.up.outcome }}" },
    run: /^args=\(--prefix "\$PREFIX" --after "\$EVIDENCE\/private\/after\.json"\)\nif \[ "\$UP" = success \]; then args\+=\(--during "\$EVIDENCE\/private\/during\.json" --plan "\$EVIDENCE\/plan\.json"\); fi\nnode e2e\/staging\/leftovers\.mjs judge "\$\{args\[@\]\}" 2>&1 \| tee "\$EVIDENCE\/verdict\.txt"; exit "\$\{PIPESTATUS\[0\]\}"$/ },
  { id: "evidence", if: ALWAYS, env: { PREFIX: "${{ steps.plan.outputs.prefix }}" }, run: 'node e2e/staging/leftovers.mjs filter "$PREFIX" "$EVIDENCE/private" "$EVIDENCE"' },
];
const FINAL_IF = "always() && (steps.up.outcome == 'failure' || steps.prove.outcome == 'failure')";

/** Everything wrong with the workflow in `source`: an empty list is a pass. */
export const problems = (source: string): ReadonlyArray<string> => {
  let doc: Record<string, any> | undefined;
  try { doc = parse(source) as Record<string, any>; } catch (error) { return [`not YAML: ${(error as Error).message}`]; }
  const out: string[] = [];
  if (doc?.name !== "ortho") out.push(`the workflow's name is ${JSON.stringify(doc?.name)}, and must be "ortho": the pull request shows "ortho / prove (test)" and the logbook's policy names the workflow`);
  const on = doc?.on;
  const triggers = typeof on === "string" ? [on] : Array.isArray(on) ? on : Object.keys(on ?? {});
  if (triggers.length !== 1 || triggers[0] !== "pull_request") out.push(`it starts on ${JSON.stringify(triggers)}, and must start on pull_request alone (never pull_request_target, which gives a fork's code the secrets)`);
  else if (JSON.stringify(on?.pull_request?.types) !== JSON.stringify(["opened", "synchronize", "reopened", "ready_for_review"])) out.push("pull_request's types are not exactly opened, synchronize, reopened, ready_for_review (a draft is marked ready to run CI once)");
  if (["branches", "branches-ignore", "paths", "paths-ignore"].some((k) => on?.pull_request?.[k] !== undefined)) out.push("pull_request takes no branch or path filters: a required check that does not start leaves the pull request waiting");
  const extra = Object.keys(doc ?? {}).filter((k) => !["name", "on", "permissions", "concurrency", "jobs"].includes(k));
  if (extra.length > 0) out.push(`the workflow has ${extra.join(", ")} at its top level: only name, on, permissions, concurrency and jobs (no env, defaults)`);
  if (JSON.stringify(doc?.permissions) !== JSON.stringify({ contents: "read" })) out.push("the workflow's permissions are not exactly contents: read (the id token is the job's alone)");
  if (doc?.concurrency?.["cancel-in-progress"] !== false || typeof doc?.concurrency?.group !== "string" || !doc.concurrency.group.includes("${{ github.event.pull_request.number }}")) out.push("runs of one pull request are not serialised without cancelling (a concurrency group naming the pull request, cancel-in-progress: false): a cancelled run is one that did not destroy");
  const jobs = Object.entries(doc?.jobs ?? {}) as Array<[string, Record<string, any>]>;
  if (jobs.length !== 1 || jobs[0]![0] !== "prove") return [...out, `it has the jobs ${JSON.stringify(jobs.map(([k]) => k))}; it must be exactly "prove" (the world, the verdicts and the destroy are one job)`];
  const job = jobs[0]![1];
  if (job.name !== "prove (test)") out.push(`the job's name is ${JSON.stringify(job.name)}, and must be "prove (test)": the check the pull request shows is "ortho / prove (test)"`);
  if (typeof job.if !== "string" || job.if.replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/g, "").trim() !== GUARD) out.push(`the job's \`if\` is ${JSON.stringify(job.if)}, and must be ${JSON.stringify(GUARD)} (a fork or a draft makes nothing)`);
  if (JSON.stringify(Object.entries(job.permissions ?? {}).sort()) !== JSON.stringify(Object.entries({ contents: "read", "id-token": "write", actions: "read", checks: "write" }).sort())) out.push("the job's permissions are not exactly contents: read, id-token: write (the verdicts' signature), actions: read (the day's count), checks: write (the verdict shows on the pull request as its own check run)");
  if (job["runs-on"] !== "ubuntu-latest") out.push("the job does not run on ubuntu-latest");
  if (job.environment !== undefined) out.push(`the job names the environment ${JSON.stringify(job.environment)}, and must name none: the credentials are the repository's secret and variable, and an environment admits only main and goal/* (design/decisions/M7-release.md, rule 2), so a pull request's run could never enter it`);
  if (!Number.isInteger(job["timeout-minutes"]) || job["timeout-minutes"] < 1 || job["timeout-minutes"] > 60) out.push("the job has no timeout of 1 to 60 whole minutes (a world's lifetime is 2 hours: the job always ends first)");
  const stray = Object.keys(job).filter((k) => !["name", "if", "permissions", "runs-on", "environment", "timeout-minutes", "env", "steps"].includes(k));
  if (stray.length > 0) out.push(`the job has ${stray.join(", ")}: no matrix, strategy, defaults, container or services`);
  if (JSON.stringify(job.env) !== JSON.stringify({ RUN, ORTHO: "node packages/cli/src/main.ts", EVIDENCE: "tmp/test-worlds", WORLD_CAP: String(CAP) })) out.push(`the job's env is not exactly RUN (${RUN}), ORTHO (the cli), EVIDENCE (tmp/test-worlds) and WORLD_CAP ("${CAP}"): no credential, and no typed run, belongs there`);

  for (const m of source.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
    const body = m[1]!.trim();
    if (!EXPRESSIONS.has(body) && !STEP_EXPRESSION.test(body)) out.push(`the expression \${{ ${body} }} is not one this workflow may use (the two credentials, the logbook's address, the pull request, the run, the day's token, a step's output or outcome)`);
  }
  for (const [what, found] of [["ORTHO_LOGBOOK_TOKEN", /ORTHO_LOGBOOK_TOKEN/], ["the local issuer (ORTHO_OIDC_*)", /ORTHO_OIDC/], ["ACTIONS_ID_TOKEN_*", /ACTIONS_ID_TOKEN/], ["pull_request_target", /pull_request_target/], ["a typed prefix", /ortho-[a-z0-9]+-(test|stg)\b|\bstg\b/]] as const) {
    if (found.test(source)) out.push(`the workflow names ${what}: the verdicts are signed with the job's own GitHub token, which prove asks the runner for, and the prefix comes from the plan`);
  }

  const steps = (job.steps ?? []) as Step[];
  const named = STEPS.map((want) => ({ want, at: steps.findIndex((s) => s.id === want.id) }));
  const final = steps.findIndex((s) => s.id === undefined && cond(s) === FINAL_IF);
  for (const { want, at } of named) if (at < 0) out.push(`no step with id ${want.id}`);
  if (final < 0) out.push(`no final step that fails the job when up or prove failed (\`if: ${FINAL_IF}\`)`);
  if (named.some((n) => n.at < 0) || final < 0) return out;
  if (named.some((n, i) => i > 0 && n.at <= named[i - 1]!.at) || final < named.at(-1)!.at) out.push(`the steps are not in the order ${STEPS.map((s) => s.id).join(", ")}, then the final failure`);
  for (const { want, at } of named) {
    const step = steps[at]!, label = want.id;
    if (cond(step) !== want.if) out.push(`${label}: its \`if\` is ${JSON.stringify(cond(step))}, and must be ${JSON.stringify(want.if)}${want.if === ALWAYS ? " (a failed prove must not leave the run's resources up, and nothing is cleaned up that was never made)" : ""}`);
    if ((step["continue-on-error"] === true) !== (want.continues === true) || (step["continue-on-error"] !== undefined && step["continue-on-error"] !== true)) out.push(`${label}: continue-on-error is ${JSON.stringify(step["continue-on-error"])}, and must be ${want.continues ? "true: it may fail so that destroy runs" : "absent"}`);
    const run = String(step.run ?? "").trim().replace(/\n\s*/g, "\n");
    if (want.run !== undefined && !(typeof want.run === "string" ? run === want.run : want.run.test(run))) out.push(`${label}: its script is not the one this check pins (${typeof want.run === "string" ? want.run : String(want.run).slice(0, 60)}...)`);
    if (run === "") out.push(`${label} has no script`);
    if (want.name !== undefined && step.name !== want.name) out.push(`${label}: its name is ${JSON.stringify(step.name)}, and must be ${JSON.stringify(want.name)} (the cap counts runs by the name GitHub shows)`);
    const env = step.env ?? {};
    if (want.env === "prove") {
      // The logbook's address is data (a variable or an earlier step's output), never typed; nothing here can stand in for the job's own token.
      // Its env is the two credentials and ORTHO_LOGBOOK_URL, and nothing else. The address comes from a variable or from a step that stands the logbook (its id starts with `logbook`; where the logbook lives is
      // an open decision, so any such step may), never from `credentials`, `cap` or a step that holds a secret, so nothing can be smuggled in as an output.
      const FROM = /^\$\{\{ (steps\.logbook[a-z]*\.outputs\.[a-z]+) \}\}$/;
      const bad = Object.entries(env).filter(([k, v]) => !(k in CREDENTIALS && v === CREDENTIALS[k as keyof typeof CREDENTIALS]) && !(k === "ORTHO_LOGBOOK_URL" && FROM.test(String(v))));
      if (bad.length > 0) out.push(`prove: its env ${bad.map(([k]) => k).join(", ")} is not a credential or ORTHO_LOGBOOK_URL holding the variable or a logbook step's output`);
      if (!FROM.test(String(env["ORTHO_LOGBOOK_URL"] ?? ""))) out.push("prove: ORTHO_LOGBOOK_URL is not set from the variable or a logbook step's output (verdicts go to a logbook, and its address is never typed here)");
      if (!/ --root examples\/plugged-in/.test(run)) out.push("prove: it does not name --root examples/plugged-in");
    } else if (JSON.stringify(Object.entries(env).sort()) !== JSON.stringify(Object.entries(want.env).sort())) {
      out.push(`${label}: its env is ${JSON.stringify(env)}; it must be exactly ${JSON.stringify(want.env)}`);
    }
    for (const key of Object.keys(step)) if (!["id", "name", "if", "continue-on-error", "run", "env"].includes(key)) out.push(`${label} has ${key}`);
  }
  const finalStep = steps[final]!;
  if (!/^echo "::error::[A-Za-z0-9 :,.$_-]*"\nexit 1$/.test(String(finalStep.run ?? "").trim())) out.push("the final step does not say why with ::error:: (plain words and the two variables) and exit 1");
  if (JSON.stringify(Object.entries(finalStep.env ?? {}).sort()) !== JSON.stringify([["PROVE", "${{ steps.prove.outcome }}"], ["UP", "${{ steps.up.outcome }}"]])) out.push("the final step's env is not exactly UP (up's outcome) and PROVE (prove's outcome)");
  for (const key of Object.keys(finalStep)) if (!["name", "if", "env", "run"].includes(key)) out.push(`the final step has ${key}`);

  // The rest of the job: a fixed set of actions at pinned versions, and an evidence upload of named files only.
  const known = new Set([...named.map((n) => steps[n.at]), finalStep]);
  const first = named[0]!.at, planAt = named.find((n) => n.want.id === "plan")!.at;
  for (const [at, s] of steps.entries()) {
    if (known.has(s)) continue;
    if (s.uses === undefined && s.run === "pnpm install --frozen-lockfile" && Object.keys(s).length === 1) { if (at > first) out.push("pnpm install comes after the credentials step: everything that installs and fetches comes before it, so nothing is made before the checks"); continue; }
    if (!USES.test(s.uses ?? "")) { out.push(`${s.name ?? s.uses ?? "a step"} is not one of the four actions this workflow uses, at a pinned version`); continue; }
    if (s.env !== undefined || s["continue-on-error"] !== undefined || s.run !== undefined || s.shell !== undefined) out.push(`${s.uses} carries a script, env or continue-on-error`);
    if (/upload-artifact/.test(s.uses!)) {
      if (at < planAt) out.push("the evidence upload comes before the plan");
      if (Object.keys(s.with ?? {}).some((k) => !["name", "path", "if-no-files-found", "retention-days"].includes(k)) || !/^[a-z][a-z-]*$/.test(String(s.with?.["name"] ?? ""))) out.push("the evidence upload sets more than name (plain words), path, if-no-files-found and retention-days");
      const paths = String(s.with?.["path"] ?? "").split("\n").map((p) => p.trim()).filter(Boolean);
      if (paths.length === 0 || paths.some((p) => !EVIDENCE.has(p)) || new Set(paths).size !== paths.length) out.push(`the evidence upload is not a list of only ${[...EVIDENCE].join(", ")}: no whole-account listing, no folder, no glob (the repository is public)`);
      if (s.with?.["retention-days"] !== 7) out.push("the evidence upload does not keep for 7 days (retention-days: 7)");
      if (cond(s) !== "always()") out.push("the evidence upload does not run `if: always()`");
      continue;
    }
    if (at > first) out.push(`${s.uses} comes after the credentials step: everything that installs and fetches comes before it`);
    const withs = JSON.stringify(Object.entries(s.with ?? {}).sort());
    const exactly = (w: Record<string, unknown>) => withs === JSON.stringify(Object.entries(w).sort());
    if (/actions\/checkout/.test(s.uses!) && !exactly({ "persist-credentials": false })) out.push("the checkout is exactly persist-credentials: false: no ref, no token, and the job's token is not left in .git/config");
    if (/actions\/setup-node/.test(s.uses!) && !exactly({ "node-version": 24, cache: "pnpm" })) out.push("setup-node is exactly node-version 24 and the pnpm cache: no registry, no token");
    if (/pnpm\/action-setup/.test(s.uses!) && !exactly({})) out.push("pnpm/action-setup takes no inputs (no run_install)");
    if (cond(s) !== undefined) out.push(`${s.uses} has an \`if\``);
  }
  for (const s of steps) if (/\$\{\{/.test(String(s.name ?? ""))) out.push(`the step name ${JSON.stringify(s.name)} holds an expression`);
  if (!steps.some((s) => /\bupload-artifact/.test(s.uses ?? ""))) out.push("the evidence is not uploaded");
  steps.forEach((s, i) => {
    const label = s.id ?? s.name ?? `step ${i}`;
    if (s.shell !== undefined || s["working-directory"] !== undefined) out.push(`${label} sets a shell or a directory`);
    // Nothing but the pinned commands talks to the account or the runner's token, and nothing hides a failure or prints the environment.
    if (/\b(wrangler|alchemy|curl|wget|gh)\b|\bsecrets\b|\bvars\b|\bset -[a-z]*x|\bset [-+]o\b|\bset \+e|\bprintenv\b|(^|[\s;|&])env\s*($|[|;&>])|\bexport\b|\bcompgen\b|\bdeclare\b|process\.env|\/proc\/|\bbash -|\bsh -|\|\| *(true|:)|\bexit 0\b|\btoJSON\b/m.test(s.run ?? "")) out.push(`${label}'s script reaches the account or a secret by itself, can print the environment or hides a failure`);
    // The credentials step and the final step are plain shell: no interpreter that could send a value anywhere. No step but the plan writes to the files that carry values between steps, and none steers the next ones.
    if ((s.id === "credentials" || s.id === undefined) && /\b(node|npx|pnpm|python3?|perl|ruby|fetch|nc|ssh|openssl)\b|\$\(|`|<\(|>\s*\/dev\/tcp/.test(s.run ?? "") && !/pnpm install --frozen-lockfile/.test(s.run ?? "")) out.push(`${label}'s script is plain shell: no interpreter, no substitution`);
    if (/GITHUB_(ENV|PATH|STATE|OUTPUT|STEP_SUMMARY)/.test(s.run ?? "") && s.id !== "plan" && s.id !== "logbook") out.push(`${label} writes to a file that carries values to later steps, which only plan may (its prefix)`);
  });
  return out;
};
