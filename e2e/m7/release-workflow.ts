// What the release workflow must be, judged from its text (M7.02, M7.06; credentials 1, 2 and 3 of `design/decisions/M7-release.md`). A pure function, so the same judge runs on the real file and on every planted wrong one
// (`05-release-workflow.test.ts`). The workflow cannot run here (it publishes to npm, makes a GitHub release and pushes to the tap), so its promises are pinned by role, not by position: what each job may hold, which
// step may see which secret, and what must have been checked before anything is sent. Written by the checks author; a builder never edits it.
import { parse } from "yaml";

export const PATH = ".github/workflows/release.yml";
export const TAP_KEY = "${{ secrets.HOMEBREW_TAP_DEPLOY_KEY }}";
export const TAP_CLONE = "https://github.com/Open-Harness/homebrew-tap.git";
export const TAP_PUSH = "git@github.com:Open-Harness/homebrew-tap.git";
/** The only run commands a release may have: these two anywhere, and the named steps below, each exactly. Anything else (`pnpm publish -r`, another `npm publish`, `gh release create`, `git push --force`) is refused. */
const GENERIC = new Set(["pnpm install --frozen-lockfile", "pnpm nx run-many -t build"]);
export const RELEASE = "node packages/cli/src/main.ts publish --release --root examples/acme";
export const PUSH = [
  "umask 077",
  `printf '%s\\n' "$HOMEBREW_TAP_DEPLOY_KEY" > "$RUNNER_TEMP/tap-key"`,
  `export GIT_SSH_COMMAND="ssh -i $RUNNER_TEMP/tap-key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes"`,
  "node packages/cli/src/main.ts publish --push-tap --root examples/acme",
].join("\n");
export const CREDENTIALS = [
  'if [ -z "${HOMEBREW_TAP_DEPLOY_KEY//[[:space:]]/}" ]; then',
  '  echo "::error::HOMEBREW_TAP_DEPLOY_KEY is not set in the release environment"',
  "  exit 1",
  "fi",
].join("\n");
export const REMOVE = 'rm -f "$RUNNER_TEMP/tap-key"';
const EXPRESSIONS = new Set(["secrets.HOMEBREW_TAP_DEPLOY_KEY", "github.token", "github.ref_name", "github.ref_type", "github.repository", "github.server_url", "github.api_url", "runner.os", "matrix.os", "matrix.target"]);
const STEP_EXPRESSION = /^(steps\.[a-z-]+\.(outputs\.[a-z]+|outcome)|needs\.[a-z-]+\.(outputs\.[a-z]+|result))$/;
const USES = /^(actions\/checkout|pnpm\/action-setup|actions\/setup-node|actions\/upload-artifact|actions\/download-artifact)@v\d+\.\d+\.\d+$/;
const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
  ["an npm token (NPM_TOKEN, NODE_AUTH_TOKEN, npm_config__auth): npm trusted publishing needs no token stored", /NPM_TOKEN|NODE_AUTH_TOKEN|npm_config__auth|NPM_CONFIG__AUTH/i],
  ["an .npmrc token line (_authToken) or a write to .npmrc", /_authToken|>>?\s*\S*\.npmrc|npm config set|npm login|npm token/],
  ["setup-node's registry-url, which writes a token line into .npmrc", /registry-url/],
  ["a trigger other than a pushed tag", /pull_request|workflow_run|schedule:|workflow_dispatch|repository_dispatch/],
  ["secrets: inherit", /secrets:\s*inherit/],
  ["a failure that is hidden or ignored", /continue-on-error|\|\|\s*(true|:)|set \+e|\bexit 0\b/],
  ["a download or a shell that is not one of the pinned commands", /\b(curl|wget)\b|\bbash -c\b|\beval\b|\bset -[a-z]*x\b|\bprintenv\b|(^|[\s;|&])env\s*($|[|;&>])/m],
  ["a provenance switch turned off", /--no-provenance|PROVENANCE:\s*["']?false/i],
];

type Step = Record<string, any> & { id?: string; run?: string; uses?: string; env?: Record<string, string>; with?: Record<string, unknown> };
type Job = Record<string, any> & { steps?: Step[] };
const runs = (s: Step, what: RegExp | string) => typeof what === "string" ? String(s.run ?? "").trim() === what : what.test(String(s.run ?? ""));
const envOf = (s: Step) => JSON.stringify(Object.entries(s.env ?? {}).sort());

export const problems = (source: string): ReadonlyArray<string> => {
  let doc: Record<string, any> | undefined;
  try { doc = parse(source) as Record<string, any>; } catch (error) { return [`not YAML: ${(error as Error).message}`]; }
  const out: string[] = [];
  if (doc?.name !== "release") out.push(`the workflow's name is ${JSON.stringify(doc?.name)}, and must be "release"`);
  if (JSON.stringify(doc?.on) !== JSON.stringify({ push: { tags: ["v*"] } })) out.push(`it starts on ${JSON.stringify(doc?.on)}, and must start on a pushed tag v* alone (no branch, no pull request, no hand-started run: a run with no tag has no version to agree with)`);
  const extra = Object.keys(doc ?? {}).filter((k) => !["name", "on", "permissions", "concurrency", "jobs"].includes(k));
  if (extra.length > 0) out.push(`the workflow has ${extra.join(", ")} at its top level: only name, on, permissions, concurrency and jobs (no env, defaults)`);
  if (JSON.stringify(doc?.permissions) !== JSON.stringify({ contents: "read" })) out.push("the workflow's permissions are not exactly contents: read (each job asks for what it needs)");
  if (doc?.concurrency?.group !== "release" || doc?.concurrency?.["cancel-in-progress"] !== false) out.push("there is no concurrency group `release` with cancel-in-progress: false (a cancelled release is a half-run one)");
  for (const [what, found] of FORBIDDEN) if (found.test(source)) out.push(`the workflow names ${what}`);
  for (const m of source.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
    const body = m[1]!.trim();
    if (!EXPRESSIONS.has(body) && !STEP_EXPRESSION.test(body)) out.push(`the expression \${{ ${body} }} is not one this workflow may use (the tap's key, the job's own token, the tag, the repository, a matrix value, a step's or a job's result)`);
  }

  const jobs = Object.entries(doc?.jobs ?? {}) as Array<[string, Job]>;
  if (!jobs.some(([id]) => id === "preflight")) return [...out, "there is no job `preflight`: the credential and the tag's agreement with every package's version are checked in a job everything else needs"];
  let npmJobs = 0, releaseJobs = 0, pushSteps = 0, keyed = 0;
  for (const [id, job] of jobs) {
    const steps = (job.steps ?? []) as Step[];
    const publish = steps.findIndex((s) => runs(s, "node tools/release/release.mjs publish"));
    const release = steps.findIndex((s) => s.id === "release");
    const push = steps.findIndex((s) => s.id === "push-tap");
    const writes = release >= 0 || push >= 0;
    const label = `job ${id}`;
    if (job.environment !== "release") out.push(`${label}: its environment is ${JSON.stringify(job.environment)}, and must be "release" (the tap's key lives there, and it admits only main and the tags v*)`);
    const stray = Object.keys(job).filter((k) => !["environment", "runs-on", "timeout-minutes", "permissions", "needs", "strategy", "steps"].includes(k));
    if (stray.length > 0) out.push(`${label} has ${stray.join(", ")}: no env, if, defaults, container, services or secrets at job level (the key is in a step's env, and no job is skipped)`);
    if (!/^(ubuntu-latest|macos-14|\$\{\{ matrix\.os \}\})$/.test(String(job["runs-on"]))) out.push(`${label}: runs-on is ${JSON.stringify(job["runs-on"])}, not ubuntu-latest, macos-14 or the matrix's os (no self-hosted runner holds these secrets)`);
    if (!Number.isInteger(job["timeout-minutes"]) || job["timeout-minutes"] < 1 || job["timeout-minutes"] > 60) out.push(`${label}: no timeout of 1 to 60 whole minutes`);
    if (id !== "preflight" && ![job.needs].flat().includes("preflight")) out.push(`${label}: it does not need preflight, so it could run before the credential and the version are checked`);
    if (job.strategy !== undefined && !(Object.keys(job.strategy).join() === "matrix" && Object.keys(job.strategy.matrix).join() === "include")) out.push(`${label}: its strategy is more than a matrix of includes`);
    const want = publish >= 0 ? { contents: "read", "id-token": "write" } : writes ? { contents: "write" } : { contents: "read" };
    if (JSON.stringify(Object.entries(job.permissions ?? {}).sort()) !== JSON.stringify(Object.entries(want).sort())) out.push(`${label}: its permissions are ${JSON.stringify(job.permissions)}, and must be exactly ${JSON.stringify(want)} (id-token: write only in the job that publishes to npm, contents: write only in the one that makes the GitHub release, never both)`);
    if (publish >= 0 && writes) out.push(`${label}: one job both publishes to npm and writes the release or the tap`);
    steps.forEach((s, at) => {
      const name = s.id ?? s.name ?? `step ${at}`;
      if (s.uses !== undefined) {
        if (!USES.test(s.uses)) out.push(`${label}: ${name} uses ${s.uses}, which is not one of the five actions at a pinned version`);
        if (/checkout/.test(s.uses) && JSON.stringify(s.with) !== JSON.stringify({ "persist-credentials": false })) out.push(`${label}: the checkout is exactly persist-credentials: false (the job's token is not left in .git/config)`);
        if (/setup-node/.test(s.uses) && JSON.stringify(Object.entries(s.with ?? {}).sort()) !== JSON.stringify(Object.entries({ "node-version": 24, cache: "pnpm" }).sort())) out.push(`${label}: setup-node is exactly node-version 24 (npm 11.5 or later, which trusted publishing needs) and the pnpm cache`);
        if (s.env !== undefined || s.run !== undefined) out.push(`${label}: ${name} is an action that carries a script or env`);
      }
      if (s.shell !== undefined || s["working-directory"] !== undefined) out.push(`${label}: ${name} sets a shell or a directory`);
      if (s.if !== undefined && !(s.id === "remove-key" && s.if === "always()")) out.push(`${label}: ${name} has an \`if\`: nothing in a release is skipped (but the key's removal, which always runs)`);
      if (s.run !== undefined) {
        const text = String(s.run).trim();
        const named: Record<string, string> = { agreement: "node tools/release/release.mjs check", release: RELEASE, "push-tap": PUSH, "remove-key": REMOVE };
        const ok = (s.id !== undefined && s.id in named && text === named[s.id]) || (s.id === "credentials" && id === "preflight") || (GENERIC.has(text) && s.id === undefined) || text === "node tools/release/release.mjs publish";
        if (!ok) out.push(`${label}: ${name} runs a command that is not on the allowlist (the install, the build, and the named steps, each exactly): ${text.split("\n")[0]!.slice(0, 60)}`);
      }
      const secretIn = Object.values(s.env ?? {}).some((v) => String(v).includes("secrets.HOMEBREW_TAP_DEPLOY_KEY"));
      if (secretIn) { keyed++; if (s.id !== "credentials" && s.id !== "push-tap") out.push(`${label}: ${name} holds the tap's deploy key, and only the step that checks it is there and the step that pushes may`); }
      if (Object.values(s.env ?? {}).some((v) => /github\.token/.test(String(v))) && !(s.id === "release" && (s.env ?? {})["GH_TOKEN"] === "${{ github.token }}")) out.push(`${label}: ${name} holds the job's token; only the release step does, as GH_TOKEN`);
    });
    if (publish >= 0) {
      npmJobs++;
      const s = steps[publish]!;
      if (JSON.stringify(Object.entries(s.env ?? {}).sort()) !== JSON.stringify([["NPM_CONFIG_PROVENANCE", "true"]])) out.push(`${label}: the publish step's env is not exactly NPM_CONFIG_PROVENANCE: "true" (provenance by trusted publishing, no token)`);
      if (!steps.slice(0, publish).some((x) => runs(x, /pnpm install --frozen-lockfile/)) || !steps.slice(0, publish).some((x) => runs(x, /\bnx\b.*\bbuild\b/))) out.push(`${label}: the install and the build do not come before the publish`);
      if (publish !== steps.length - 1) out.push(`${label}: the publish is not the job's last step`);
    }
    if (writes) {
      releaseJobs++;
      const r = steps[release], p = steps[push];
      if (r === undefined || p === undefined) { out.push(`${label}: it has ${r === undefined ? "no step `release`" : "no step `push-tap`"}: the release and the tap's push are two steps of one job, in that order`); continue; }
      if (release > push || steps[push + 1]?.id !== "remove-key" || push + 1 !== steps.length - 1) out.push(`${label}: \`release\` does not come before \`push-tap\`, or the step \`remove-key\` (if: always()) is not right after it and last: the key's file is removed whatever happened`);
      const rm = steps[push + 1];
      if (rm !== undefined && (rm.env !== undefined || rm.if !== "always()")) out.push(`${label}: remove-key has env, or does not run \`if: always()\``);
      if (!runs(r, RELEASE)) out.push(`${label}: the release step is not exactly \`${RELEASE}\` (acme's CLI only: M7.06's formula)`);
      if (JSON.stringify(Object.entries(r.env ?? {}).sort()) !== JSON.stringify(Object.entries({ GH_TOKEN: "${{ github.token }}", ORTHO_TAP_REMOTE: TAP_CLONE }).sort())) out.push(`${label}: the release step's env is not exactly GH_TOKEN (the job's token) and ORTHO_TAP_REMOTE (${TAP_CLONE}): no key, no npm credential`);
      if (!runs(p, PUSH)) out.push(`${label}: the push step's script is not exactly the pinned one (umask 077; the deploy key written once, by printf, to a file under $RUNNER_TEMP; ssh by that file; publish --push-tap --root examples/acme)`);
      if (envOf(p) !== JSON.stringify(Object.entries({ HOMEBREW_TAP_DEPLOY_KEY: TAP_KEY, ORTHO_TAP_REMOTE: TAP_PUSH }).sort())) out.push(`${label}: the push step's env is not exactly the deploy key (a secret) and ORTHO_TAP_REMOTE (${TAP_PUSH})`);
      pushSteps++;
    }
  }
  if (npmJobs !== 1) out.push(`${npmJobs} jobs publish to npm with \`node tools/release/release.mjs publish\`; exactly one must`);
  if (releaseJobs !== 1 || pushSteps !== 1) out.push("exactly one job must make the GitHub release and push the tap");
  const pre = (doc?.jobs?.preflight ?? {}) as Job, pres = (pre.steps ?? []) as Step[];
  const cred = pres.find((s) => s.id === "credentials"), agree = pres.find((s) => s.id === "agreement");
  if (cred === undefined) out.push("preflight has no step `credentials`");
  else {
    if (JSON.stringify(cred.env) !== JSON.stringify({ HOMEBREW_TAP_DEPLOY_KEY: TAP_KEY })) out.push("preflight: credentials' env is not exactly the tap's deploy key");
    if (String(cred.run ?? "").trim() !== CREDENTIALS) out.push("preflight: the credentials script is not exactly the pinned one (plain shell, the key tested for blanks and never printed, nothing else: a command appended to it would run with the key in its env)");
  }
  if (agree === undefined || !runs(agree, "node tools/release/release.mjs check") || agree.env !== undefined) out.push("preflight has no step `agreement` that runs exactly `node tools/release/release.mjs check` with no env of its own");
  if (cred !== undefined && agree !== undefined && pres.indexOf(cred) > pres.indexOf(agree)) out.push("preflight checks the version before the credential");
  if (keyed !== 2) out.push(`the tap's deploy key is in ${keyed} steps' env; it must be in exactly two: credentials, and push-tap`);
  return out;
};
