// Check 8 (D3 #15.8, walkthrough step 12): replayed staging traffic gives p95 against budget and refusal counts; a planted
// slow handler shows as drift; the portal shows `allowance.spend` `test ✔ staging ✔`, and after a budget edit `stale` on
// spend only.
//
// Chosen where D3 #14 is open:
// - Traffic is real calls to staging through the generated acme CLI (ACME_URL, ACME_TOKEN) as signed-in people; staging's
//   telemetry reaches the local OTLP sink that `ortho watch` reads (D3 #12) with no step of the check's.
// - `ortho watch --env staging` prints a line per operation seen, `<op> p95 <n>ms (budget <n>ms) ✔` or `… ✘` (✘ is p95 over
//   budget), then `refusals: <Error> <n>  <Error> <n>` (counts of every refusal in the window), then `drift <ops>|none`, the
//   operations separated by spaces or commas. An operation drifts when its p95 is over its budget.
// - Staging (and so the sink's window) keeps its state across a promote: the same people, tokens and allowance still work.
// - The portal's verdicts are data (K19: the page draws them in the browser): `GET <staging url>/_portal/v1/blueprint` gives the digest,
//   `GET <staging url>/_portal/v1/snapshot?digest=<digest>` gives `proofs`, one per operation and environment, each with a `state`:
//   `recorded-pass` is a tick (`test ✔ staging ✔`), `stale` is a verdict whose model has since changed. It reads the logbook,
//   so a new revision's model and its test verdicts (`prove --env test`) are what make staging's old ones stale.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build, promote, proveInTest, release } from "./flow.ts";
import { type Stack, finish, startStack } from "./services.ts";
import { acmeCli, commit, declareSpendBudget, install, project, run, seed } from "./support.ts";

const copy = project();
let stack: Stack | undefined;
beforeAll(async () => { stack = await startStack(copy.root, 8, { registry: true }); });
afterAll(async () => { try { await finish(copy.root, stack); } finally { copy.remove(); } });

/**
 * The p95 budget this check declares for `allowance.spend`, in milliseconds (acme's own is 150: an example's promise, which a
 * shared CI runner cannot keep from one run to the next). What the check proves is the pipeline, not a runner's speed: healthy
 * traffic stays under the budget, a handler that does real work drifts over it. The evidence, ST1-25-flakes: a healthy
 * spend p95 is 5 to 20 ms on a Mac (the worst call 87 ms) and was 197 ms on a CI runner (run 44783700097, 280 ms in 44698831344);
 * the planted slow handler is 1500 to 3500 ms on the same Mac. 500 is 2.5 times the worst healthy p95 seen and 3 times under the
 * best slow one, so a stall on either side doesn't flip it, and a handler that really got slower still does.
 */
const BUDGET_MS = 500;

type People = ReturnType<typeof seed>;

/** olga spends one unit `ok` times, and asks for more than is left `over` times (refused: AllowanceExceeded). */
const replay = (url: string, people: People, ok: number, over: number) => {
  for (let i = 0; i < ok; i++) {
    const spent = acmeCli(copy.root, url, people.olga.token, "allowance", "spend", "--allowance", people.allowance, "--amount", "1", "--memo", `replay ${i}`);
    expect(spent.status, spent.out).toBe(0);
  }
  for (let i = 0; i < over; i++) {
    const refused = acmeCli(copy.root, url, people.olga.token, "allowance", "spend", "--allowance", people.allowance, "--amount", "100000", "--memo", "too much");
    expect(refused.status, refused.out).toBe(41);
  }
};

const watch = (env: Stack["env"], root: string) => {
  const said = run(root, env, "watch", "--env", "staging");
  expect(said.status, said.out.slice(-3000)).toBe(0);
  const spend = said.lines.find((l) => l.startsWith("allowance.spend p95 "));
  expect(spend, said.out).toBeDefined();
  const [, p95, budget, mark] = /^allowance\.spend p95 (\d+)ms \(budget (\d+)ms\) (✔|✘)$/.exec(spend!) ?? [];
  expect(p95, spend).toBeDefined();
  const drift = said.lines.find((l) => l.startsWith("drift "));
  expect(drift, said.out).toBeDefined();
  return {
    p95: Number(p95), budget: Number(budget), mark, refusals: said.lines.find((l) => l.startsWith("refusals:")) ?? "",
    drift: drift!.slice("drift ".length).split(/[\s,]+/).filter((w) => w !== "" && w !== "none"),
  };
};

interface Proof { readonly operation: string; readonly environment: string; readonly state: string }
/** The portal's proofs, from its data API (K19: the page draws from it; a verdict is data): the blueprint's digest, then the snapshot for it. */
const portal = async (url: string): Promise<ReadonlyArray<Proof>> => {
  // Synchronous CLI commands can restart staging while this event loop cannot retire an idle pooled socket.
  const get = (path: string) => fetch(`${url}${path}`, { headers: { connection: "close" } });
  const blueprint = await get("/_portal/v1/blueprint");
  expect(blueprint.status, "the portal's blueprint").toBe(200);
  const { digest } = await blueprint.json() as { digest: string };
  const snapshot = await get(`/_portal/v1/snapshot?digest=${digest}`);
  expect(snapshot.status, "the portal's snapshot for that blueprint").toBe(200);
  return (await snapshot.json() as { proofs: ReadonlyArray<Proof> }).proofs;
};
const ticked = (proofs: ReadonlyArray<Proof>, op: string) => proofs.filter((p) => p.operation === op && p.state === "recorded-pass").map((p) => p.environment);
const show = (proofs: ReadonlyArray<Proof>) => proofs.map((p) => `${p.operation} ${p.environment} ${p.state}`).join("\n");

describe("check 8: watch and the portal", () => {
  it("p95 against budget and refusal counts; a slow handler drifts; the portal shows verdicts, then stale on spend only", async () => {
    const s = stack!;
    const { root } = copy;
    // The first revision, with the budget this check declares, goes test, then staging; production takes it too, so the portal has something to be stale in.
    declareSpendBudget(root, BUDGET_MS);
    const generated = run(root, s.env, "generate");
    expect(generated.status, generated.out.slice(-3000)).toBe(0);
    const first = commit(root, "the check's budget");
    release(root, s, first);
    const url = s.url("staging");

    const proofs = await portal(url);
    expect(ticked(proofs, "allowance.spend"), show(proofs)).toEqual(expect.arrayContaining(["test", "staging"]));

    // Replayed traffic against the staging that is running now.
    const people = seed(root, url);
    replay(url, people, 30, 3);
    const healthy = watch(s.env, root);
    expect(healthy.budget).toBe(BUDGET_MS);
    expect(healthy.p95, `healthy spend p95 against its ${BUDGET_MS} ms budget`).toBeLessThanOrEqual(BUDGET_MS);
    expect(healthy.mark).toBe("✔");
    expect(healthy.refusals).toMatch(/AllowanceExceeded 3\b/);
    expect(healthy.drift).toEqual([]);

    // A slow spend handler, a new revision: it proves and promotes (performance is review only), and its traffic drifts.
    install(root, "slow-spend/spend.ts", "src/allowance/spend.ts");
    const slow = commit(root, "a slow spend");
    build(root, s, slow);
    proveInTest(root, s); // staging takes a revision only with `main` verdicts in test (D3 #92)
    expect(promote(root, s, "staging").status).toBe(0);
    replay(url, people, 30, 0);
    const drifting = watch(s.env, root);
    expect(drifting.p95, `slow spend p95 against its ${BUDGET_MS} ms budget`).toBeGreaterThan(BUDGET_MS);
    expect(drifting.mark).toBe("✘");
    expect(drifting.drift).toEqual(["allowance.spend"]);

    // A looser budget, a new revision whose test verdicts are posted: the old verdicts of spend, and of nothing else, are stale.
    declareSpendBudget(root, 2 * BUDGET_MS);
    const looser = commit(root, "a looser budget");
    const proved = proveInTest(root, s);
    expect(proved.lines.some((l) => l.endsWith(`(revision ${looser})`))).toBe(true);
    const stale = await portal(url);
    expect(stale.filter((p) => p.operation === "allowance.spend").map((p) => p.state), show(stale)).toContain("stale");
    const others = stale.filter((p) => p.operation !== "allowance.spend" && p.state === "recorded-pass");
    expect(others.length, show(stale)).toBeGreaterThan(0);
    expect(stale.filter((p) => p.operation !== "allowance.spend" && p.state === "stale"), "only spend is stale").toEqual([]);
  });
});
