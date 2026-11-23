// Check 42 (M2.02, the principal part; M2.03 builds it): the principal journeys of M2-auth, run for real. Written by the checks author; a builder never
// edits this file, the journeys or the fixture app (AGENTS.md, "Journeys and checks come first"). It is authored on `goal-3/m2-03-check` and lands with
// M2.03 as a pair (`design/decisions/G12-paired-landing.md`).
//
// WHAT IS REQUIRED. Four journeys in acme (`examples/acme/journeys/`) and one in the adapter fixture app (`e2e/fixtures/m1/service-caller/`), each run alone by
// `ortho prove --only <name>`, must pass:
//   a key and a session are the same person     session, key and agent key: one person, `via` answered as "session", "key" and "agent"
//   an agent passes the owner rule              an agent holds Ada's role; `api-key.create` is refused to an agent and to a key, allowed to Ada's session
//   an agent cannot consent for a person        `invitation.accept` is refused to Olga's agent and not to Olga; an agent's tools lack it and `api-key.create`
//   the system is nobody signed in              `Blueprint.system` is refused by `signedIn` and by a rule role
//   a service is nobody signed in               a `service` role admits its own mount only; `signedIn` refuses a service
// The journeys cannot say what a span carried, so this file reads the spans the run's collector wrote (a recording, not prove's own word): a refusal
// is traced as `<operation>.refused` with `principal.kind`, and an agent, the system and a service are named by it, with no `principal.person` on the
// system's. And the model (`ortho model --json`) records what the declarations say: `via` on the narrowed entries and `agentTool` on every operation.
//
// THE RED REASON. Today `Role` and `RoleOf` have no `.via` or `.notVia`, so acme's `api-key.create` and `invitation.accept` do not load; the journeys use
// `lacks`, `Blueprint.system`, an actor's `.via(...)` and `.tools()`, none of which exists; `session.show` answers no `via`; there is no `service` role.
// Every test below that runs acme is red for those and nothing else, and so is every other check that copies acme until M2.03 builds them (the pair's
// accepted state, G12). The control (the fixture app without its service role proves) is red too: the fixture app's environments say `issues:`, which today's `Blueprint.environment` does not know (M2-auth, "Smaller calls" 4).
// No Docker. Prove's own world uses port 0.
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, nothingRunning, repo } from "../layer1/support.ts";
import { installFixture } from "./packages.ts";
import { prove, type Proved } from "./prove-speed.ts";
import { model as modelOf, succeeds } from "./support.ts";

const SERVICE_APP = join(repo, "e2e/fixtures/m1/service-caller");
const copies: Array<{ readonly remove: () => void }> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

/** A copy of acme, as it stands on this branch. */
const acmeCopy = () => { const copy = copyOf(acme); copies.push(copy); return copy.root; };

/** The adapter fixture app: acme's tools and package.json, none of acme's blueprint, the app's own files and both adapters installed, then generated. */
const serviceApp = (variant?: "control") => {
  const copy = copyOf(acme, ["package.json"]);
  copies.push(copy);
  for (const part of ["ortho.config.ts", "blueprint", "src"]) cpSync(join(SERVICE_APP, part), join(copy.root, part), { recursive: true });
  if (variant !== undefined) {
    const overlay = join(SERVICE_APP, "variants", variant);
    cpSync(overlay, copy.root, { recursive: true });
    rmSync(join(copy.root, "REMOVE"), { force: true });
    for (const path of readFileSync(join(overlay, "REMOVE"), "utf8").split("\n").filter(Boolean)) rmSync(join(copy.root, path), { force: true });
  }
  installFixture(copy.root, "remote");
  installFixture(copy.root, "ledger");
  succeeds(copy.root, "generate");
  return copy.root;
};

interface Span { readonly name: string; readonly attributes: Readonly<Record<string, string>> }
/** Every span the run's collector wrote, with its attributes as text. */
const spansOf = (root: string): ReadonlyArray<Span> => {
  const file = join(root, ".ortho/prove-telemetry/traces.jsonl");
  if (!existsSync(file)) return [];
  type Wire = { resourceSpans?: ReadonlyArray<{ scopeSpans?: ReadonlyArray<{ spans?: ReadonlyArray<{ name: string; attributes?: ReadonlyArray<{ key: string; value: Record<string, unknown> }> }> }> }> };
  const found: Array<Span> = [];
  for (const line of readFileSync(file, "utf8").split("\n").filter((l) => l !== "")) {
    let parsed: Wire;
    try { parsed = JSON.parse(line) as Wire; } catch { continue; }
    for (const r of parsed.resourceSpans ?? []) for (const sc of r.scopeSpans ?? []) for (const sp of sc.spans ?? []) {
      found.push({ name: sp.name, attributes: Object.fromEntries((sp.attributes ?? []).map((a) => [a.key, String(Object.values(a.value)[0] ?? "")])) });
    }
  }
  return found;
};
const named = (spans: ReadonlyArray<Span>, name: string) => spans.filter((s) => s.name === name);
const kinds = (spans: ReadonlyArray<Span>) => spans.map((s) => s.attributes["principal.kind"] ?? "none").sort();

/** The journey's own line and the step lines under it, from what prove printed (prove also judges the evals, which one journey cannot satisfy: they are not read here). */
const blockOf = (out: string, name: string) => {
  const lines = out.split("\n");
  const at = lines.findIndex((l) => l.startsWith(`journey ${name} `));
  if (at < 0) return `no line for the journey, prove said:\n${out.slice(0, 1500)}`;
  const block = [lines[at]!];
  for (const line of lines.slice(at + 1)) { if (!line.startsWith(" ")) break; block.push(line); }
  return block.join("\n");
};

/** The journey, run alone: prove must have written a report holding it, with every step passing. */
const passes = (proved: Proved, name: string, steps: number) => {
  expect(proved.report, `prove wrote no report:\n${proved.out.slice(-1500)}`).toBeDefined();
  const journeys = proved.report!.journeys;
  expect(journeys.map((j) => j.name), proved.out.slice(-800)).toEqual([name]);
  const journey = journeys[0]!;
  const here = blockOf(proved.out, name);
  expect(journey.steps.filter((s) => s.verdict !== "pass").map((s) => s.name), `${name}: the steps that did not pass\n${here}`).toEqual([]);
  expect(journey.steps, `${name}: every step ran, none skipped`).toHaveLength(steps);
  expect(journey.verdict, `${name}\n${here}`).toBe("pass");
};

describe("42 control: the fixture app proves", () => {
  it("the adapter fixture app without its service role proves `a person is signed in`: a person is let through `signedIn`", async () => {
    const root = serviceApp("control");
    const proved = await prove(root, "--only", "a person is signed in");
    passes(proved, "a person is signed in", 1);
    expect(named(spansOf(root), "probe.who"), "the call reached the operation").toHaveLength(1);
    nothingRunning(root);
  }, 600_000);
});

describe("42 M2.02: acme's principal journeys (M2.03)", () => {
  it("a key and a session are the same person: show answers the same person, and `via` as session, key and agent", async () => {
    const root = acmeCopy();
    const proved = await prove(root, "--only", "a key and a session are the same person");
    passes(proved, "a key and a session are the same person", 3);
    const shows = named(spansOf(root), "session.show");
    expect(shows, "one span for each of the three calls").toHaveLength(3);
    expect(kinds(shows).filter((k) => k === "agent"), "the agent key's call is traced as an agent").toEqual(["agent"]);
    const persons = shows.filter((s) => s.attributes["principal.kind"] !== "agent");
    expect(persons.map((s) => s.attributes["principal.person"] ?? ""), "the session's and the key's calls name the one person").toEqual([persons[0]!.attributes["principal.person"], persons[0]!.attributes["principal.person"]]);
    expect(persons[0]!.attributes["principal.person"], "and name one").toMatch(/^per_/);
    nothingRunning(root);
  }, 600_000);

  it("an agent passes the owner rule: it invites and reads as Ada, and is refused a key that a key or an agent would make", async () => {
    const root = acmeCopy();
    const proved = await prove(root, "--only", "an agent passes the owner rule");
    passes(proved, "an agent passes the owner rule", 5);
    const spans = spansOf(root);
    expect(kinds(named(spans, "api-key.create.refused")), "Ada's agent and Ada's key, refused").toEqual(["agent", "person"]);
    expect(named(spans, "api-key.create"), "only Ada's own session reached the handler").toHaveLength(1);
    expect(kinds(named(spans, "invitation.send")), "the agent's invitation passed the role, traced as an agent").toEqual(["agent"]);
    nothingRunning(root);
  }, 600_000);

  it("an agent cannot consent for a person: Olga's agent is refused the accept and her tools lack it, and Olga accepts herself", async () => {
    const root = acmeCopy();
    const proved = await prove(root, "--only", "an agent cannot consent for a person");
    passes(proved, "an agent cannot consent for a person", 5);
    const spans = spansOf(root);
    expect(kinds(named(spans, "invitation.accept.refused")), "the refusal is the agent's").toEqual(["agent"]);
    expect(named(spans, "invitation.accept"), "Bob and Olga, accepting for themselves, reached the handler").toHaveLength(2);
    nothingRunning(root);
  }, 600_000);

  it("the system is nobody signed in: signedIn and a rule role refuse it, and its refusals name no person", async () => {
    const root = acmeCopy();
    const proved = await prove(root, "--only", "the system is nobody signed in");
    passes(proved, "the system is nobody signed in", 4);
    const spans = spansOf(root);
    for (const name of ["session.show.refused", "organization.create.refused", "invitation.send.refused"]) {
      const refused = named(spans, name).filter((s) => s.attributes["principal.kind"] === "system");
      expect(refused, `${name} with principal.kind=system`).toHaveLength(1);
      expect(refused[0]!.attributes["principal.person"], `${name} writes no person`).toBeUndefined();
    }
    nothingRunning(root);
  }, 600_000);
});

describe("42 M2.02: the adapter fixture app's service journey (M2.03)", () => {
  it("a service is nobody signed in: a service role admits its own mount only, and signedIn refuses a service", async () => {
    const root = serviceApp();
    const proved = await prove(root, "--only", "a service is nobody signed in");
    passes(proved, "a service is nobody signed in", 14);
    const spans = spansOf(root);
    expect(kinds(named(spans, "probe.who.refused")), "the service refused where a person is needed").toEqual(["service"]);
    expect(kinds(named(spans, "probe.price.refused")), "the other mount's service, a person, an agent and the system, refused").toEqual(["agent", "person", "service", "system"]);
    expect(kinds(named(spans, "probe.price")), "the pricing service reached its own operation").toEqual(["service"]);
    expect(kinds(named(spans, "probe.ping")), "anyone admitted the system and a service, traced as each").toEqual(["service", "system"]);
    expect(kinds(named(spans, "probe.tick")), "the system reached what is for it, traced as the system").toEqual(["system"]);
    expect(kinds(named(spans, "probe.tick.refused")), "a person and a service, refused what is for the system").toEqual(["person", "service"]);
    expect(kinds(named(spans, "probe.ledger")), "the ledger service reached its own operation").toEqual(["service"]);
    expect(kinds(named(spans, "probe.ledger.refused")), "the pricing service, refused it").toEqual(["service"]);
    nothingRunning(root);
  }, 600_000);
});

describe("42 M2.02: what the model records of the declarations (M2.03)", () => {
  it("the two narrowings keep their ways in, only an operation an agent may call is a tool, and `session.show` answers `via`", () => {
    const root = acmeCopy();
    const operations = (modelOf(root) as unknown as { operations: Record<string, { allowed: ReadonlyArray<{ via?: ReadonlyArray<string> }>; agentTool?: boolean; answer?: Record<string, unknown> }> }).operations;
    expect(operations["api-key.create"]!.allowed[0]!.via, "a key is made in person").toEqual(["device", "session"]);
    expect(operations["invitation.accept"]!.allowed[0]!.via, "consent is not an agent's").toEqual(["device", "key", "session"]);
    expect(operations["invitation.send"]!.allowed[0]!.via, "an entry nobody narrowed says nothing").toBeUndefined();
    expect(operations["invitation.accept"]!.agentTool).toBe(false);
    expect(operations["api-key.create"]!.agentTool, "no entry admits an agent").toBe(false);
    expect(operations["invitation.send"]!.agentTool).toBe(true);
    expect(operations["session.show"]!.agentTool).toBe(true);
    expect(operations["organization.create"]!.agentTool, "signedIn admits an agent").toBe(true);
    expect(operations["system.health"]!.agentTool, "anyone admits an agent").toBe(true);
    for (const [name, op] of Object.entries(operations)) expect(typeof op.agentTool, `${name} says whether it is a tool`).toBe("boolean");
    expect(Object.keys(operations["session.show"]!.answer ?? {}), "show answers via beside the person and the email").toEqual(expect.arrayContaining(["person", "email", "via"]));
    expect(succeeds(root, "check").status).toBe(0);
  }, 600_000);
});
