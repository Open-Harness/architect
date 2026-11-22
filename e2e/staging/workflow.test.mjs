// Run by `nx run e2e:test` (node --test): the staging workflow is what its header says, judged by `workflow.mjs`, and the judge fails each planted wrong workflow. The real workflow is never
// run here; it deploys, so it runs only by hand (`.github/workflows/staging.yml`).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { problems } from "./workflow.mjs";

const real = readFileSync(join(import.meta.dirname, "../../.github/workflows/staging.yml"), "utf8");
const said = (source) => problems(source).join("\n");
/** The real workflow with one thing replaced; throws when the thing is not there, so a plant that matches nothing is not a pass. */
const swap = (from, to) => {
  assert.ok(real.includes(from), `the workflow has no ${JSON.stringify(from)} to plant over`);
  return real.replace(from, to);
};
const TOKEN = "CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}";
const DESTROY_HEAD = "        id: destroy\n";
const UP = "        id: up\n        continue-on-error: true\n        run: $ORTHO env up staging --run \"$RUN\" --root examples/plugged-in\n        env:\n          ";
const UPLOAD = "          path: |\n            tmp/staging/plan.json\n            tmp/staging/story.txt\n            tmp/staging/verdict.txt\n            tmp/staging/during-run.json\n            tmp/staging/after-run.json\n";
const MKDIR = "mkdir -p \"$EVIDENCE/private\"\n";

describe("the staging workflow", () => {
  test("is what the check says: by hand only, destroy and the listing always, two credentials only in the steps that talk to Cloudflare, nothing printed", () => {
    assert.deepEqual(problems(real), []);
  });
});

describe("the judge fails each planted wrong workflow", () => {
  const plants = [
    // ---- how it starts ----
    ["a push trigger beside the dispatch", () => swap("on:\n  workflow_dispatch:", "on:\n  push:\n    branches: [main]\n  workflow_dispatch:"), /starts on/],
    ["a pull_request trigger", () => swap("on:\n  workflow_dispatch:", "on:\n  pull_request:\n  workflow_dispatch:"), /starts on/],
    ["a schedule", () => swap("on:\n  workflow_dispatch:", "on:\n  schedule:\n    - cron: '0 3 * * *'\n  workflow_dispatch:"), /starts on/],
    ["no workflow_dispatch at all", () => swap("on:\n  workflow_dispatch:", "on:\n  push:"), /starts on/],
    ["an input on the dispatch (the run is named by its id)", () => swap("on:\n  workflow_dispatch:", "on:\n  workflow_dispatch:\n    inputs:\n      run:\n        type: string"), /takes no inputs/],
    // ---- destroy and the listing always run ----
    ["destroy that does not always run", () => swap(`${DESTROY_HEAD}        if: always()\n`, DESTROY_HEAD), /destroy: its `if` is undefined/],
    ["destroy that runs only when the story passed", () => swap(`${DESTROY_HEAD}        if: always()\n`, `${DESTROY_HEAD}        if: success()\n`), /destroy: its `if`/],
    ["destroy that is always() && false", () => swap(`${DESTROY_HEAD}        if: always()\n`, `${DESTROY_HEAD}        if: always() && false\n`), /destroy: its `if`/],
    ["destroy that is false && always()", () => swap(`${DESTROY_HEAD}        if: always()\n`, `${DESTROY_HEAD}        if: "false && always()"\n`), /destroy: its `if`/],
    ["destroy that is !always()", () => swap(`${DESTROY_HEAD}        if: always()\n`, `${DESTROY_HEAD}        if: \${{ !always() }}\n`), /destroy: its `if`|expression/],
    ["destroy that only looks for 'always()' in a string", () => swap(`${DESTROY_HEAD}        if: always()\n`, `${DESTROY_HEAD}        if: contains(github.ref, 'always()')\n`), /destroy: its `if`/],
    ["destroy that continues on error (a failed destroy is swallowed)", () => swap(`${DESTROY_HEAD}        if: always()\n`, `${DESTROY_HEAD}        if: always()\n        continue-on-error: true\n`), /destroy: continue-on-error/],
    ["destroy that is a dry run", () => swap('$ORTHO env destroy staging --run "$RUN"', '$ORTHO env destroy staging --plan --run "$RUN"'), /destroy: its script/],
    ["destroy that only echoes", () => swap('run: $ORTHO env destroy staging --run "$RUN"', 'run: echo $ORTHO env destroy staging --run "$RUN"'), /destroy: its script/],
    ["destroy that hides its failure", () => swap('$ORTHO env destroy staging --run "$RUN" --root examples/plugged-in\n', '$ORTHO env destroy staging --run "$RUN" --root examples/plugged-in || true\n'), /destroy: its script|hides a failure/],
    ["no destroy step", () => swap("id: destroy", "id: destroyed"), /no step with id destroy/],
    ["the listing after destroy that does not always run", () => swap("        id: after\n        if: always()\n", "        id: after\n"), /after: its `if`/],
    ["the judgement that does not always run", () => swap("        id: judge\n        if: always()\n", "        id: judge\n"), /judge: its `if`/],
    ["the judgement that continues on error", () => swap("        id: judge\n        if: always()\n", "        id: judge\n        if: always()\n        continue-on-error: true\n"), /judge: continue-on-error/],
    ["a judgement whose exit is dropped", () => swap('; exit "${PIPESTATUS[0]}"\n        env:\n          PREFIX', "\n        env:\n          PREFIX"), /judge: its script/],
    ["a judgement whose exit is 0", () => swap('tee "$EVIDENCE/verdict.txt"; exit "${PIPESTATUS[0]}"', 'tee "$EVIDENCE/verdict.txt"; exit 0'), /judge: its script|hides a failure/],
    ["a judgement that never compares up with the plan", () => swap('--during "$EVIDENCE/private/during.json" --plan "$EVIDENCE/plan.json"', "--x"), /judge: its script/],
    ["a judgement that does not take --before", () => swap('--before "$EVIDENCE/private/before.json"', ""), /judge: its script/],
    ["a judgement with the prefix hard-coded", () => swap("          PREFIX: ${{ steps.plan.outputs.prefix }}", "          PREFIX: ortho-pluggedin-stg-1"), /judge: its env/],
    ["a judgement that is skipped when up failed", () => swap("        id: judge\n        if: always()\n", "        id: judge\n        if: always() && steps.up.outcome == 'success'\n"), /judge: its `if`/],
    // ---- up, the story, the order ----
    ["up that never runs", () => swap("        id: up\n", "        id: up\n        if: false\n"), /up: its `if`/],
    ["up that hides its failure", () => swap('--run "$RUN" --root examples/plugged-in\n        env:\n          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}\n          CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}\n\n      # While', '--run "$RUN" --root examples/plugged-in || true\n        env:\n          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}\n          CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}\n\n      # While'), /up: its script|hides a failure/],
    ["up that only echoes", () => swap('run: $ORTHO env up staging --run "$RUN"', 'run: echo $ORTHO env up staging --run "$RUN"'), /up: its script/],
    ["no continue-on-error on up (a failed up would stop the job before destroy only if destroy were not always)", () => swap("        id: up\n        continue-on-error: true\n", "        id: up\n"), /up: continue-on-error/],
    ["a story that runs another environment", () => swap("prove --env staging", "prove --env local"), /story: its script/],
    ["a story that hides its failure", () => swap('; exit "${PIPESTATUS[0]}"\n\n      # Destroy', "\n\n      # Destroy"), /story: its script/],
    ["a story that never runs", () => swap("        id: story\n        continue-on-error: true\n        if: steps.up.outcome == 'success'\n", "        id: story\n        continue-on-error: true\n        if: false\n"), /story: its `if`/],
    ["no step ids on up and the story (their outcomes would be empty)", () => swap("        id: up\n", "").replace("        id: story\n", ""), /no step with id up/],
    ["destroy before the story", () => swap("      - name: the story\n", `      - name: destroy early\n        id: destroy\n        if: always()\n        run: $ORTHO env destroy staging --run "$RUN" --root examples/plugged-in\n        env:\n          ${TOKEN}\n          CLOUDFLARE_ACCOUNT_ID: \${{ vars.CLOUDFLARE_ACCOUNT_ID }}\n      - name: the story\n`).replace("      - name: destroy\n        id: destroy\n", "      - name: destroy\n        id: destroyed\n"), /not in the order|no step with id destroy/],
    ["no snapshot before up", () => swap('snapshot "$EVIDENCE/private/before.json"', 'snapshot "$EVIDENCE/private/x.json"'), /before: its script/],
    ["the final failure step that never fails", () => real.replace(/exit 1\n(?![\s\S]*exit 1\n)/, "exit 2\n"), /final failure: its script|no step/],
    ["the final failure step skipped", () => swap("if: always() && (steps.up.outcome == 'failure' || steps.story.outcome == 'failure')", "if: false"), /no step the final failure/],
    ["the final failure step on the wrong outcomes", () => swap("if: always() && (steps.up.outcome == 'failure' || steps.story.outcome == 'failure')", "if: always() && steps.up.outcome == 'success' && steps.story.outcome == 'success'"), /no step the final failure/],
    ["the final failure step that only echoes exit 1", () => real.replace(/          exit 1\n(?![\s\S]*          exit 1\n)/, "          echo exit 1\n"), /final failure: its script/],
    // ---- the job ----
    ["a second job", () => `${real}  other:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n`, /must be exactly "refuse" then "staging"/],
    ["no timeout", () => swap("    timeout-minutes: 30\n", ""), /no timeout/],
    ["a timeout of 0.001 minutes", () => swap("timeout-minutes: 30", "timeout-minutes: 0.001"), /no timeout/],
    ["the goal-branch guard missing", () => swap("    if: startsWith(github.ref, 'refs/heads/goal/')\n", ""), /staging job's `if`/],
    ["the guard widened to any branch", () => swap("startsWith(github.ref, 'refs/heads/goal/')\n    runs-on", "startsWith(github.ref, 'refs/heads/')\n    runs-on"), /staging job's `if`/],
    ["the guard widened to every ref", () => swap("    if: startsWith(github.ref, 'refs/heads/goal/')\n", "    if: always()\n"), /staging job's `if`/],
    ["the guard on the tag form of a goal ref", () => swap("    if: startsWith(github.ref, 'refs/heads/goal/')\n", "    if: startsWith(github.ref, 'refs/tags/goal/')\n"), /staging job's `if`/],
    ["no refuse job", () => { const t = real.replace(/  # A dispatch on any ref[\s\S]*?\n  staging:/, "  staging:"); return t; }, /must be exactly "refuse" then "staging"/],
    ["refuse that runs on every dispatch", () => swap("    if: \"!startsWith(github.ref, 'refs/heads/goal/')\"\n", ""), /refuse job's `if`/],
    ["refuse that runs on the goal branch too", () => swap("    if: \"!startsWith(github.ref, 'refs/heads/goal/')\"\n", "    if: always()\n"), /refuse job's `if`/],
    ["refuse that does not fail", () => swap("          exit 1\n", "          exit 0\n"), /refuse job must be one step/],
    ["refuse that does not name the ref", () => swap(" this dispatch is on $REF\"", " this dispatch is refused\""), /refuse job must be one step/],
    ["refuse given the token", () => swap("        env:\n          REF: ${{ github.ref }}\n", `        env:\n          REF: \${{ github.ref }}\n          ${TOKEN}\n`), /refuse job holds only REF/],
    ["refuse given the protected environment", () => swap("    timeout-minutes: 5\n", "    timeout-minutes: 5\n    environment: staging\n"), /refuse job is only/],
    ["refuse that checks the code out", () => swap("    steps:\n      - name: refuse\n", "    steps:\n      - uses: actions/checkout@v7.0.1\n      - name: refuse\n"), /refuse job must be one step/],
    ["a job that is never run", () => swap("    if: startsWith(github.ref, 'refs/heads/goal/')\n", "    if: false\n"), /staging job's `if`/],
    ["a matrix", () => swap("    if: startsWith(github.ref, 'refs/heads/goal/')\n    runs-on: ubuntu-latest\n", "    if: startsWith(github.ref, 'refs/heads/goal/')\n    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        x: [1, 2]\n"), /the job has strategy/],
    ["write permissions on the job", () => swap("    if: startsWith(github.ref, 'refs/heads/goal/')\n    runs-on: ubuntu-latest\n", "    if: startsWith(github.ref, 'refs/heads/goal/')\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n      id-token: write\n"), /the job has permissions/],
    ["a shell chosen for every step", () => swap("    if: startsWith(github.ref, 'refs/heads/goal/')\n    runs-on: ubuntu-latest\n", "    if: startsWith(github.ref, 'refs/heads/goal/')\n    runs-on: ubuntu-latest\n    defaults:\n      run:\n        shell: bash -x {0}\n"), /the job has defaults/],
    ["a step with a shell of its own", () => swap("        id: plan\n", "        id: plan\n        shell: bash -x {0}\n"), /plan has shell/],
    ["a run cancelled midway", () => swap("cancel-in-progress: false", "cancel-in-progress: true"), /serialised/],
    ["write permissions", () => swap("  contents: read", "  contents: write"), /permissions are not/],
    ["the run id as a constant", () => swap("RUN: ${{ github.run_id }}${{ github.run_attempt }}", "RUN: 1"), /job's env/],
    ["env at the top of the workflow", () => swap("permissions:\n", "env:\n  X: y\npermissions:\n"), /top level/],
    // ---- credentials, and nothing printed ----
    ["the token in the job's env", () => swap("      EVIDENCE: tmp/staging\n", `      EVIDENCE: tmp/staging\n      ${TOKEN}\n`), /job's env/],
    ["the token in the workflow's env", () => swap("permissions:\n", `env:\n  ${TOKEN}\npermissions:\n`), /top level/],
    ["a second secret on the story", () => swap("          ORTHO_STAGING_SUBDOMAIN:", "          EXTRA: ${{ secrets.OTHER }}\n          ORTHO_STAGING_SUBDOMAIN:"), /story: its env|the expression/],
    ["the story's token from a different secret name", () => { const t = real.replace(/(- name: the story[\s\S]*?CLOUDFLARE_API_TOKEN: )\$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/, "$1${{ secrets.OTHER_TOKEN }}"); assert.notEqual(t, real); return t; }, /story: its env|the expression/],
    ["the story's account from a secret rather than the variable up uses", () => { const t = real.replace(/(- name: the story[\s\S]*?CLOUDFLARE_ACCOUNT_ID: )\$\{\{ vars\.CLOUDFLARE_ACCOUNT_ID \}\}/, "$1${{ secrets.CLOUDFLARE_API_TOKEN }}"); assert.notEqual(t, real); return t; }, /story: its env/],
    ["the story with the token but no account", () => { const t = real.replace(/(- name: the story[\s\S]*?)          CLOUDFLARE_ACCOUNT_ID: \$\{\{ vars\.CLOUDFLARE_ACCOUNT_ID \}\}\n/, "$1"); assert.notEqual(t, real); return t; }, /story: its env/],
    ["the story with the account but no token", () => { const t = real.replace(/(- name: the story[\s\S]*?)          CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}\n/, "$1"); assert.notEqual(t, real); return t; }, /story: its env/],
    ["the story with no subdomain (its address cannot be formed)", () => swap("          ORTHO_STAGING_SUBDOMAIN: ${{ steps.subdomain.outputs.subdomain }}\n", ""), /story: its env/],
    ["the story's subdomain taken from a secret", () => swap("ORTHO_STAGING_SUBDOMAIN: ${{ steps.subdomain.outputs.subdomain }}", "ORTHO_STAGING_SUBDOMAIN: ${{ secrets.CLOUDFLARE_WORKERS_SUBDOMAIN }}"), /story: its env|the expression/],
    ["the story's subdomain typed in", () => swap("ORTHO_STAGING_SUBDOMAIN: ${{ steps.subdomain.outputs.subdomain }}", "ORTHO_STAGING_SUBDOMAIN: acme"), /story: its env/],
    ["no subdomain step", () => swap("      - name: subdomain\n        id: subdomain\n", "      - name: other\n        id: other\n"), /no step with id subdomain/],
    ["the subdomain step after the story", () => { const t = real.replace(/      # The account's workers\.dev subdomain, read[\s\S]*?CLOUDFLARE_ACCOUNT_ID: \$\{\{ vars\.CLOUDFLARE_ACCOUNT_ID \}\}\n\n/, ""); return t.replace("      # Destroy always runs", `      - name: subdomain\n        id: subdomain\n        if: steps.up.outcome == 'success'\n        run: node e2e/staging/subdomain.mjs "$GITHUB_OUTPUT"\n        env:\n          ${TOKEN}\n          CLOUDFLARE_ACCOUNT_ID: \${{ vars.CLOUDFLARE_ACCOUNT_ID }}\n\n      # Destroy always runs`); }, /not in the order/],
    ["the subdomain step without the token", () => swap("        run: node e2e/staging/subdomain.mjs \"$GITHUB_OUTPUT\"\n        env:\n          " + TOKEN + "\n", "        run: node e2e/staging/subdomain.mjs \"$GITHUB_OUTPUT\"\n        env:\n"), /subdomain: its env/],
    ["the subdomain step printing the response", () => swap('node e2e/staging/subdomain.mjs "$GITHUB_OUTPUT"', 'curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" | tee "$GITHUB_OUTPUT"'), /subdomain: its script/],
    ["the subdomain step that runs even when up failed", () => swap("        id: subdomain\n        if: steps.up.outcome == 'success'\n", "        id: subdomain\n        if: always()\n"), /subdomain: its `if`/],
    ["the subdomain step that may fail quietly", () => swap("        id: subdomain\n", "        id: subdomain\n        continue-on-error: true\n"), /subdomain: continue-on-error/],
    ["the token on the plan", () => swap("        id: plan\n", `        id: plan\n        env:\n          ${TOKEN}\n`), /plan: its env/],
    ["the token on the judgement", () => swap("          UP: ${{ steps.up.outcome }}\n\n      # The run's own", `          UP: \${{ steps.up.outcome }}\n          ${TOKEN}\n\n      # The run's own`), /judge: its env/],
    ["destroy without the token", () => swap(`${DESTROY_HEAD}        if: always()\n        run: $ORTHO env destroy staging --run "$RUN" --root examples/plugged-in\n        env:\n          ${TOKEN}\n`, `${DESTROY_HEAD}        if: always()\n        run: $ORTHO env destroy staging --run "$RUN" --root examples/plugged-in\n        env:\n          X: y\n`), /destroy: its env/],
    ["the account id taken from a secret", () => swap("CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}", "CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}"), /secrets\.CLOUDFLARE_ACCOUNT_ID|env is/],
    ["another secret", () => swap("        id: plan\n", "        id: plan\n        env:\n          X: ${{ secrets.ANTHROPIC_API_KEY }}\n"), /secrets\.ANTHROPIC_API_KEY/],
    ["every secret dumped as JSON", () => swap("        id: plan\n", "        id: plan\n        env:\n          DUMP: ${{ toJSON(secrets) }}\n"), /toJSON\(secrets\)/],
    ["the token by bracket syntax", () => swap("${{ secrets.CLOUDFLARE_API_TOKEN }}", "${{ secrets['CLOUDFLARE_API_TOKEN'] }}"), /secrets\['CLOUDFLARE_API_TOKEN'\]/],
    ["the token written into a script", () => swap(MKDIR, `${MKDIR}          echo \${{ secrets.CLOUDFLARE_API_TOKEN }} > /dev/null\n`), /touches a credential|plan: its script/],
    ["the token echoed from its variable", () => swap("echo \"prefix=", "echo \"$CLOUDFLARE_API_TOKEN\" | base64\n          echo \"prefix="), /touches a credential|plan: its script/],
    ["set -x in a step", () => swap(MKDIR, `set -x\n          ${MKDIR}`), /plan: its script|print the environment/],
    ["printenv in a step", () => swap('echo "prefix=', 'printenv\n          echo "prefix='), /plan: its script|print the environment/],
    ["env | sort in a step", () => swap('echo "prefix=', 'env | sort\n          echo "prefix='), /plan: its script|print the environment/],
    ["node printing process.env", () => swap('echo "prefix=', "node -p process.env\n          echo \"prefix="), /plan: its script|print the environment/],
    ["a prefix typed in a step", () => swap('--prefix "$PREFIX"', "--prefix ortho-pluggedin-stg-$RUN"), /judge: its script|types a prefix/],
    ["an action nobody listed", () => swap("      - uses: actions/checkout@v7.0.1\n", "      - uses: evil/thing@main\n      - uses: actions/checkout@v7.0.1\n"), /not one of the four actions/],
    ["an action on a moving tag", () => swap("actions/setup-node@v7.1.0", "actions/setup-node@main"), /not one of the four actions/],
    ["a checkout that carries a script", () => swap("      - uses: actions/checkout@v7.0.1\n", "      - uses: actions/checkout@v7.0.1\n        env:\n          X: y\n"), /carries a script, env/],
    // ---- the evidence ----
    ["the whole evidence folder uploaded (wrangler's logs with it)", () => swap(UPLOAD, "          path: tmp/staging/\n"), /evidence upload is not a list/],
    ["a glob uploaded", () => swap("            tmp/staging/plan.json\n", "            tmp/staging/*.json\n"), /evidence upload is not a list/],
    ["a file of the runner's uploaded", () => swap("            tmp/staging/plan.json\n", "            ~/.config/.wrangler/config/token.txt\n"), /evidence upload is not a list/],
    ["a path that climbs out", () => swap("            tmp/staging/plan.json\n", "            tmp/staging/../../../home/runner/.npmrc.txt\n"), /evidence upload is not a list/],
    // The repository is public: the whole-account listings name every resource of the account, other apps' included, and must never be uploaded.
    ["the whole-account listing before up uploaded (every resource of the account, others' included)", () => swap("            tmp/staging/plan.json\n", "            tmp/staging/plan.json\n            tmp/staging/private/before.json\n"), /evidence upload is not a list/],
    ["the whole-account listing after destroy uploaded", () => swap("tmp/staging/after-run.json", "tmp/staging/private/after.json"), /evidence upload is not a list/],
    ["the whole-account listing uploaded under its old name", () => swap("tmp/staging/during-run.json", "tmp/staging/during.json"), /evidence upload is not a list/],
    ["the private folder uploaded", () => swap(UPLOAD, "          path: tmp/staging/private/\n"), /evidence upload is not a list/],
    ["a listing that the workflow filters nowhere (the snapshot written where the upload reads it)", () => swap('snapshot "$EVIDENCE/private/after.json"', 'snapshot "$EVIDENCE/after.json"'), /after: its script/],
    ["a step that prints the whole account's listing (names of other apps in the log)", () => swap("      - uses: actions/upload-artifact@v7.0.2\n", "      - run: cat tmp/staging/private/after.json\n      - uses: actions/upload-artifact@v7.0.2\n"), /not one of the four actions/],
    ["the judgement that is handed no filter: the listings are filtered by no step", () => swap("        id: evidence\n", "        id: evidenceless\n"), /no step with id evidence/],
    ["the filter that does not always run", () => swap("        id: evidence\n        if: always()\n", "        id: evidence\n"), /evidence: its `if`/],
    ["the filter that takes a typed prefix", () => swap('filter "$PREFIX"', "filter ortho-pluggedin-stg-1"), /evidence: its script|types a prefix/],
    ["the filter that cuts the private folder into itself", () => swap('"$EVIDENCE/private" "$EVIDENCE"', '"$EVIDENCE/private" "$EVIDENCE/private"'), /evidence: its script/],
    ["an upload that keeps for the default 90 days", () => swap("          retention-days: 7\n", ""), /does not keep for 7 days/],
    ["an upload that keeps for 30 days", () => swap("retention-days: 7", "retention-days: 30"), /does not keep for 7 days/],
    ["an upload with another option (hidden files)", () => swap("          retention-days: 7\n", "          retention-days: 7\n          include-hidden-files: true\n"), /sets include-hidden-files/],
    // ---- the protected environment, and the run id ----
    ["no environment on the job (a deploy any branch can start)", () => swap("    environment: staging\n", ""), /environment is undefined/],
    ["another environment", () => swap("environment: staging", "environment: production"), /environment is "production"/],
    ["a run id that is the same for every attempt (a re-run would meet the first attempt's resources)", () => swap("RUN: ${{ github.run_id }}${{ github.run_attempt }}", "RUN: ${{ github.run_id }}"), /job's env/],
    ["a run id with a separator (it must stay [a-z0-9]{1,20})", () => swap("RUN: ${{ github.run_id }}${{ github.run_attempt }}", "RUN: ${{ github.run_id }}-${{ github.run_attempt }}"), /job's env/],
    ["an upload that does not always run", () => swap("      - uses: actions/upload-artifact@v7.0.2\n        if: always()\n", "      - uses: actions/upload-artifact@v7.0.2\n"), /evidence upload does not run/],
    ["no upload at all", () => swap("      - uses: actions/upload-artifact@v7.0.2\n        if: always()\n", "      - uses: actions/setup-node@v7.1.0\n        if: always()\n"), /not uploaded|carries a script|not one of/],
    ["not YAML", () => "a: [", /not YAML/],
  ];
  for (const [name, make, say] of plants) {
    test(`${name}`, () => {
      const found = said(make());
      assert.notEqual(found, "", `nothing was wrong with: ${name}`);
      assert.match(found, say);
    });
  }
});
