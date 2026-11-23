// Check 01 (M2.02): the journeys of the two plugins, the part that needs no unsettled spelling. Four moved out of acme (sign
// up and sign in, an owner makes an api key, invite and accept, an invitation is used once) and one that is new and
// needs nothing new (an outsider cannot revoke an invitation). They live in the stand-in plugins
// `e2e/fixtures/m2/{auth,organizations}/source/blueprint/journeys/`, where the packages of M2.05 and M2.07 will carry byte
// for byte copies; the app that mounts both is `e2e/fixtures/m2/app/`; every handler of the stand-ins is empty.
//
// Assumptions beyond M2-auth ("For the checks author (M2.02)"):
//  1. `invite and accept` keeps acme's steps, and acme's file starts from `founded` and sends its own invitations; the
//     record's table says `invited`. Acme's steps win ("keep their steps and meaning"); the world it starts from is `founded`.
//  2. `sign up and sign in` gains a last step for `session.show`'s `via`, read through a signed-in cast member (`ada`),
//     because a step cannot act as the newcomer with the token the sign-in just answered (`prove` carries a token only
//     for cast members the world signs up).
//  3. `via` is answered as one of `session`, `key`, `device`, `agent` (the value `Way` in the auth stand-in).
//  4. The roles carry no `.via` or `.notVia` narrowing yet (the record's call 14): those are M2.03's surface and the
//     journeys that read them are the later checks slice's. Nothing here uses one.
//  5. Plugin starting worlds are M2.22's: until the mount fold carries them, a journey that starts from `founded` or
//     `invited` stops before its first step, "starting world founded is not in blueprint/starting-worlds". The control
//     below plants the worlds in the app (`app/variants/worlds-in-app`), which is what M2.22 will do, so the journeys
//     reach the empty handlers today.
//  6. `prove` runs the app's own evals as well; only the five journeys' lines are judged here.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Prove } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { PORTS, app, fixtures, nothingRunning, repo, run, type Copy } from "./support.ts";

const copies: Array<Copy> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

type Failure =
  /** The journey's own step reaches an empty handler; every step before it holds. */
  | { readonly kind: "step"; readonly step: string; readonly operation: string; readonly before: ReadonlyArray<string> }
  /** The journey's starting world calls an empty handler, and no step runs. */
  | { readonly kind: "world"; readonly world: string; readonly operation: string };
interface Expectation { readonly plugin: "auth" | "organizations"; readonly file: string; readonly name: string; readonly failure: Failure }

const journeys: ReadonlyArray<Expectation> = [
  { plugin: "auth", file: "sign-up-and-sign-in.ts", name: "sign up and sign in",
    failure: { kind: "step", step: "the newcomer signs up", operation: "person.sign-up", before: ["before signing up the newcomer is nobody"] } },
  { plugin: "organizations", file: "an-owner-makes-an-api-key.ts", name: "an owner makes an api key", failure: { kind: "world", world: "founded", operation: "organization.create" } },
  { plugin: "organizations", file: "invite-and-accept.ts", name: "invite and accept", failure: { kind: "world", world: "founded", operation: "organization.create" } },
  { plugin: "organizations", file: "an-invitation-is-used-once.ts", name: "an invitation is used once", failure: { kind: "world", world: "founded", operation: "organization.create" } },
  { plugin: "organizations", file: "an-outsider-cannot-revoke-an-invitation.ts", name: "an outsider cannot revoke an invitation", failure: { kind: "world", world: "founded", operation: "organization.create" } },
];
const dir = (plugin: string) => join(fixtures, plugin, "source/blueprint");
const text = (plugin: string, path: string) => readFileSync(join(dir(plugin), path), "utf8");

/** The `journey` line of each of ours and the step lines under it, from a report's lines. */
const blocksOf = (lines: ReadonlyArray<string>) => {
  const blocks = new Map<string, Array<string>>();
  let current: Array<string> | undefined;
  for (const line of lines) {
    if (line.startsWith("journey ")) {
      const mine = journeys.find((j) => line.startsWith(`journey ${j.name} `));
      current = mine ? [line] : undefined;
      if (mine && current) blocks.set(mine.name, current);
    } else if (current && line.startsWith("  ")) current.push(line);
    else current = undefined;
  }
  return blocks;
};

/**
 * What a report must say of one journey for it to have failed on an empty handler, for the stated reason: the problems,
 * none when it did. A journey that passed, is missing, was skipped, stopped for another reason or reached another
 * handler is a problem.
 */
const problems = (lines: ReadonlyArray<string>): ReadonlyArray<string> => {
  const blocks = blocksOf(lines);
  const found: Array<string> = [];
  for (const { name, failure } of journeys) {
    const block = blocks.get(name);
    if (block === undefined) { found.push(`${name}: not in the report`); continue; }
    const all = block.join("\n");
    const [header = ""] = block;
    if (!header.startsWith(`journey ${name} ✘ `)) found.push(`${name}: must fail, not pass: ${header}`);
    if (/skipped/.test(all)) found.push(`${name}: a step is skipped`);
    if (failure.kind === "world") {
      if (!header.includes(`starting world ${failure.world}: ${failure.operation} died`)) found.push(`${name}: must stop at starting world ${failure.world} calling ${failure.operation}: ${header}`);
      if (!header.includes(`BlankReached: ${failure.operation}`)) found.push(`${name}: must name BlankReached: ${failure.operation} in the header: ${header}`);
      if (!header.includes("no step ran")) found.push(`${name}: no step may have run: ${header}`);
      if (block.length > 1) found.push(`${name}: no step line may follow a "no step ran" header: ${block[1]}`);
    } else {
      const failed = block.slice(1).map((l) => /^ {2}✘ "([^"]*)"/.exec(l)?.[1]).filter((t): t is string => t !== undefined);
      if (failed[0] !== failure.step) found.push(`${name}: the first failing step must be "${failure.step}", it was ${JSON.stringify(failed[0])}`);
      for (const held of failure.before) if (failed.includes(held)) found.push(`${name}: step "${held}" must hold (the runtime refuses before the handler)`);
      // The failing step's own lines only: a step reports several `✘ "<title>"` lines (the answer, the span, the death, the handler),
      // all under its title. A line of any other step, whatever it says, is not evidence for this one.
      const own = block.slice(1).filter((l) => /^ {2}✘ "([^"]*)"/.exec(l)?.[1] === failure.step);
      if (!own.join("\n").includes(`BlankReached: ${failure.operation}`)) found.push(`${name}: must name BlankReached: ${failure.operation} on the step "${failure.step}"`);
    }
  }
  return found;
};

const prove = async (variant: string | undefined, port: number) => {
  const copy = app(variant);
  copies.push(copy);
  const made = run(copy.root, "generate");
  expect(made.status, made.out).toBe(0);
  const report = await Effect.runPromise(Effect.scoped(Prove.run({ root: copy.root, port })));
  return { copy, report, lines: report.lines };
};

describe("01 the journeys: what is written", () => {
  it("each plugin holds exactly its journeys, named as the record names them", () => {
    for (const plugin of ["auth", "organizations"] as const) {
      expect(readdirSync(join(dir(plugin), "journeys")).filter((f) => f.endsWith(".ts")).sort(), plugin).toEqual(journeys.filter((j) => j.plugin === plugin).map((j) => j.file).sort());
    }
    for (const j of journeys) expect(text(j.plugin, `journeys/${j.file}`), j.file).toContain(`Blueprint.journey("${j.name}"`);
  });

  it("the four moved journeys keep every step of acme's; the first gains one, and nothing else is added or dropped", () => {
    const titles = (source: string) => [...source.matchAll(/s\.step\(\s*\n\s*"([^"]+)"/g)].map((m) => m[1]);
    const moved = [
      ["auth", "sign-up-and-sign-in.ts", "sign-up-and-sign-in.ts", ["a signed-in person is told who they are and that they came in by a session"]],
      ["organizations", "an-owner-makes-an-api-key.ts", "an-owner-makes-an-api-key.ts", []],
      ["organizations", "invite-and-accept.ts", "invite-and-accept.ts", []],
      ["organizations", "an-invitation-is-used-once.ts", "an-invitation-is-used-once.ts", []],
    ] as const;
    for (const [plugin, file, acmeFile, added] of moved) {
      const theirs = titles(readFileSync(join(repo, "examples/acme/journeys", acmeFile), "utf8"));
      expect(theirs.length, `acme's ${acmeFile} has steps`).toBeGreaterThan(0);
      expect(titles(text(plugin, `journeys/${file}`)), file).toEqual([...theirs, ...added]);
    }
  });

  it("the moved journeys carry the changes the record names: no `cap`, `via` read after a sign-in, no way-in narrowing used", () => {
    for (const j of journeys) {
      const source = text(j.plugin, `journeys/${j.file}`);
      expect(source, `${j.file}: organizations take no cap`).not.toMatch(/\bcap\b/);
      expect(source, `${j.file}: no spelling of M2.03 is used`).not.toMatch(/\bVia\b|\.via\(|\.notVia\(|\.tools\(|\blacks\(|Blueprint\.system|service:/);
    }
    expect(text("auth", "journeys/sign-up-and-sign-in.ts")).toContain('expect((a) => a.via).toBe("session")');
  });

  it("the plugins' worlds are the record's: founded (ada, no cap), invited (from founded, olga), joined (from invited, olga accepts)", () => {
    const founded = text("organizations", "starting-worlds/founded.ts");
    expect(founded).toContain('Blueprint.startingWorld("founded"');
    expect(founded).toContain('{ name: "Acme Demo" }');
    expect(founded).not.toMatch(/\bcap\b|from:/);
    const invited = text("organizations", "starting-worlds/invited.ts");
    expect(invited).toContain('Blueprint.startingWorld("invited"');
    expect(invited).toContain('from: "founded"');
    expect(invited).toMatch(/gives: .*invitation/);
    const joined = text("organizations", "starting-worlds/joined.ts");
    expect(joined).toContain('Blueprint.startingWorld("joined"');
    expect(joined).toContain('from: "invited"');
    expect(joined).toMatch(/s\.olga\.run\(accept/);
    expect(joined).toMatch(/gives: .*membership/);
    expect(readdirSync(join(dir("organizations"), "starting-worlds")).sort()).toEqual(["founded.ts", "invited.ts", "joined.ts"]);
  });

  it("the builders' copies, once there are some, are byte for byte these", () => {
    // Absent is allowed (M2.05 and M2.07 are not built); present and different is not.
    for (const [plugin, packageDir] of [["auth", "packages/auth"], ["organizations", "packages/organizations"]] as const) {
      const copy = join(repo, packageDir, "blueprint");
      if (!existsSync(copy)) continue;
      for (const sub of ["journeys", "starting-worlds"]) {
        const mine = join(dir(plugin), sub);
        if (!existsSync(mine)) continue;
        expect(existsSync(join(copy, sub)), `${packageDir}/blueprint/${sub} is missing`).toBe(true);
        expect(readdirSync(join(copy, sub)).sort(), `${packageDir}/blueprint/${sub} holds these files and no others`).toEqual(readdirSync(mine).sort());
        for (const file of readdirSync(mine)) expect(readFileSync(join(copy, sub, file), "utf8"), `${sub}/${file} was edited: journeys belong to their author`).toBe(readFileSync(join(mine, file), "utf8"));
      }
    }
  });
});

describe("01 the judge: it accepts what an empty handler does and refuses everything else", () => {
  const good = [
    "journey sign up and sign in ✘ 1/6 steps",
    '  ✘ "the newcomer signs up": the server died: BlankReached: person.sign-up',
    '  ✘ "a wrong password is refused": the server died: BlankReached: session.sign-in',
    ...journeys.slice(1).map((j) => `journey ${j.name} ✘ starting world founded: organization.create died: null (BlankReached: organization.create); no step ran`),
    "person.sign-up answer shape ✔",
  ];
  it("control: the lines of an empty-handler run are accepted", () => expect(problems(good)).toEqual([]));
  it("a journey that passes is refused", () => expect(problems(good.map((l) => l.startsWith("journey invite and accept") ? "journey invite and accept ✔ 12/12 steps" : l))).toEqual(expect.arrayContaining([expect.stringContaining("invite and accept")])));
  it("a journey missing from the report is refused", () => expect(problems(good.filter((l) => !l.startsWith("journey an invitation is used once")))).toEqual(["an invitation is used once: not in the report"]));
  it("a journey stopped by a missing starting world, not an empty handler, is refused (the M2.22 reason)", () => {
    const wrong = good.map((l) => l.startsWith("journey invite and accept") ? "journey invite and accept ✘ starting world founded is not in blueprint/starting-worlds; no step ran" : l);
    expect(problems(wrong)).toEqual(expect.arrayContaining([expect.stringContaining("invite and accept: must stop at starting world founded")]));
  });
  it("a journey whose starting world reaches another handler is refused", () => {
    const wrong = good.map((l) => l.startsWith("journey invite and accept") ? l.replaceAll("organization.create", "invitation.send") : l);
    expect(problems(wrong)).not.toEqual([]);
  });
  it("sign-up failing at the wrong step, or with step one failing, is refused", () => {
    const late = good.filter((l) => !l.includes("the newcomer signs up"));
    expect(problems(late)).toEqual(expect.arrayContaining([expect.stringContaining("the first failing step must be")]));
    const early = [good[0]!, '  ✘ "before signing up the newcomer is nobody": expected refused', ...good.slice(1)];
    expect(problems(early)).toEqual(expect.arrayContaining([expect.stringContaining("must be")]));
  });
  // Negative controls for the BlankReached text: it must be on the failing step's own line (or, for a world, on the header), never
  // merely somewhere in the journey's block. Each of these passed the first judge, which searched the whole block.
  it("a BlankReached on a later step does not stand in for the failing step's own (the decoy)", () => {
    const decoy = [good[0]!, '  ✘ "the newcomer signs up": the server died: payload missing', '  ✘ "a wrong password is refused": the server died: BlankReached: person.sign-up', ...good.slice(3)];
    expect(problems(decoy)).toEqual(expect.arrayContaining([expect.stringContaining("sign up and sign in: must name BlankReached: person.sign-up on the step \"the newcomer signs up\"")]));
  });
  it("a failing step that names another handler is refused, even when a later step names the right one", () => {
    const other = [good[0]!, '  ✘ "the newcomer signs up": the server died: BlankReached: session.sign-in', '  ✘ "a wrong password is refused": the server died: BlankReached: person.sign-up', ...good.slice(3)];
    expect(problems(other)).not.toEqual([]);
  });
  it("a step line under a \"no step ran\" header is refused (the world kind)", () => {
    const worldPlusStep = good.flatMap((l) => l.startsWith("journey invite and accept") ? [l, '  ✘ "a step": the server died: BlankReached: organization.create'] : [l]);
    expect(problems(worldPlusStep)).toEqual(expect.arrayContaining([expect.stringContaining("invite and accept: no step line may follow")]));
  });
  it("a world whose header lacks BlankReached is refused, though a step line under it has one", () => {
    const moved = good.flatMap((l) => l.startsWith("journey invite and accept") ? ["journey invite and accept ✘ starting world founded: organization.create died: null; no step ran", '  ✘ "a step": BlankReached: organization.create'] : [l]);
    expect(problems(moved)).toEqual(expect.arrayContaining([expect.stringContaining("invite and accept: must name BlankReached: organization.create in the header")]));
  });
  it("a skipped step is refused", () => expect(problems([...good.slice(0, 2), '  ✘ "x": skipped: omitted', ...good.slice(2)])).toEqual(expect.arrayContaining([expect.stringContaining("skipped")])));
});

describe("01 empty handlers: every journey fails, naming its step or its world", () => {
  it("a control that works today: with the plugins' worlds planted in the app (what M2.22 will do), each journey reaches an empty handler", async () => {
    const { copy, report, lines } = await prove("worlds-in-app", PORTS.empty);
    expect(report.passed, lines.join("\n")).toBe(false);
    expect(problems(lines), lines.join("\n")).toEqual([]);
    nothingRunning(copy.root);
  });

  it("the stand-ins as shipped (the app plants no world): each journey still fails on the empty handler, not for want of a world (M2.22)", async () => {
    const { copy, report, lines } = await prove(undefined, PORTS.shipped);
    expect(report.passed, lines.join("\n")).toBe(false);
    expect(problems(lines), `the plugins' starting worlds are not carried by the mount yet (M2.22):\n${lines.filter((l) => l.startsWith("journey ")).join("\n")}`).toEqual([]);
    nothingRunning(copy.root);
  });
});
