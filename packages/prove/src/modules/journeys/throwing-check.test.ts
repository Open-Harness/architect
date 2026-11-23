// S-27: a journey check that throws fails its own step; it does not kill `ortho prove`. Each test reads one real run of the command on a copy of acme whose
// journeys are the ones below, so the human output, the `--report` file and the exit code are what a climber sees.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acmeCopy } from "../../../test/acme.ts";

const main = resolve(import.meta.dirname, "../../../../cli/src/main.ts");
const own = acmeCopy();
afterAll(() => own.remove());

const journey = (name: string, steps: string) => `import { Blueprint, expect, noEvents } from "orthograph";
import health from "../blueprint/things/system/verbs/health.ts";

export default Blueprint.journey(${JSON.stringify(name)}, {
  cast: { visitor: Blueprint.anyone },
  steps: (s) => [
${steps}
  ],
});
`;
const step = (title: string, ...checks: ReadonlyArray<string>) => `    s.step(${JSON.stringify(title)}, s.visitor.run(health, {}), ${checks.join(", ")}),`;

const secretFile = join(own.root, "the-token.txt");

// The journeys run in file-name order: the throwing one is first, so a run that dies on it never reaches the others.
const files: Readonly<Record<string, string>> = {
  "a-throws.ts": journey("a check that throws", [
    step("the answer has no links, expect", `expect((a: any) => a.links.map((l: string) => l)).toMatch(/x/)`),
    step("the answer has no links, expect-equal", `expect((a: any) => a.links.map((l: string) => l)).toEqual(["x"])`),
    step("the check throws a string", `expect((): never => { throw "boom"; }).toMatch(/x/)`),
    step("the check throws a RangeError", `expect((): never => { throw new RangeError("rng"); }).toMatch(/x/)`),
    step("the check returns an object that holds itself", `expect((): unknown => { const o: Record<string, unknown> = {}; o["self"] = o; return o; }).toMatch(/x/)`),
    step("a step after the throws still runs", `expect((a) => a.status).toBe("ok")`, "noEvents()"),
  ].join("\n")),
  // A real sign-in answer holds a token. The pick writes the token to a file (the run is another process) and then throws, so a test can look for it.
  "d-secret.ts": `import { Blueprint, expect } from "orthograph";
import { writeFileSync } from "node:fs";
import signUp from "../blueprint/things/person/verbs/sign-up.ts";
import signIn from "../blueprint/things/session/verbs/sign-in.ts";

export default Blueprint.journey("a check that throws on a secret", {
  cast: { newcomer: Blueprint.anyone },
  steps: (s) => [
    s.step("the newcomer signs up", s.newcomer.run(signUp, { email: s.newcomer.email, password: s.newcomer.password, name: "Newcomer" })),
    s.step("the pick sees the token and throws", s.newcomer.run(signIn, { email: s.newcomer.email, password: s.newcomer.password }),
      expect((a: any) => { writeFileSync(${JSON.stringify(secretFile)}, String(a.token)); return a.token.nope.deeper; }).toMatch(/x/)),
  ],
});
`,
  "b-control.ts": journey("a check that returns false", step("the status is not what it says", `expect((a) => a.status).toBe("down")`)),
  "c-later.ts": journey("a later journey", step("the status is ok", `expect((a) => a.status).toBe("ok")`)),
};

const run = (only: ReadonlyArray<string> = Object.keys(files).filter((f) => f !== "d-secret.ts")) => {
  const journeys = join(own.root, "journeys");
  rmSync(journeys, { recursive: true, force: true });
  mkdirSync(journeys);
  for (const [file, text] of Object.entries(files)) if (only.includes(file)) writeFileSync(join(journeys, file), text);
  const report = join(own.root, "report.json");
  const out = spawnSync(process.execPath, [main, "prove", "--env", "local", "--root", own.root, "--report", report], { cwd: own.root, encoding: "utf8", timeout: 170_000, maxBuffer: 64 * 1024 * 1024 });
  return { out, text: `${out.stdout}\n${out.stderr}`, report };
};

describe("S-27: a journey check that throws", () => {
  const ran: { value?: ReturnType<typeof run> } = {};
  const result = () => (ran.value ??= run());

  it("fails its step with the journey, the step, the answer and the error's message, and no stack trace", { timeout: 180_000 }, () => {
    const { text } = result();
    for (const title of ["the answer has no links, expect", "the answer has no links, expect-equal"]) {
      const line = text.split("\n").find((l) => l.includes(`✘ "${title}":`));
      expect(line, `no failure line for "${title}"`).toBeDefined();
      expect(line).toContain("a check that throws");
      expect(line).toContain("a check threw on an answer with keys [status]: TypeError:");
      expect(line).toContain("Cannot read properties of undefined (reading 'map')");
    }
    expect(text).not.toMatch(/^\s+at .*:\d+:\d+/m);
  });

  it("fails a step whose check throws something that is not a TypeError, naming what it threw", { timeout: 180_000 }, () => {
    const { text } = result();
    const line = (title: string) => text.split("\n").find((l) => l.includes(`✘ "${title}":`));
    expect(line("the check throws a string"), "no failure line for the string").toMatch(/: boom$/);
    expect(line("the check throws a RangeError"), "no failure line for the RangeError").toMatch(/RangeError: rng$/);
  });

  it("fails a step whose check returns an object that holds itself, with a named line, and the run still writes its report", { timeout: 180_000 }, () => {
    const { text, report } = result();
    const line = text.split("\n").find((l) => l.includes('✘ "the check returns an object that holds itself":'));
    expect(line, "no failure line for the circular object").toBeDefined();
    expect(line).toContain("[Circular]");
    expect(text).not.toContain("Maximum call stack");
    expect(existsSync(report)).toBe(true);
  });

  it("goes on: the step after the throws, and every later journey, run, and a later journey passes", { timeout: 180_000 }, () => {
    const { text } = result();
    expect(text).toContain("journey a check that throws ✘ 1/6 steps");
    expect(text).toContain("journey a check that returns false ✘ 0/1 steps");
    expect(text).toContain("journey a later journey ✔ 1/1 steps");
  });

  it("writes --report, with the throwing steps failed and the rest as they were", { timeout: 180_000 }, () => {
    const { report } = result();
    expect(existsSync(report)).toBe(true);
    const data = JSON.parse(readFileSync(report, "utf8")) as {
      passed: boolean;
      journeys: ReadonlyArray<{ name: string; verdict: string; steps: ReadonlyArray<{ name: string; verdict: string; failures: ReadonlyArray<{ message: string }> }> }>;
    };
    expect(data.passed).toBe(false);
    const byName = Object.fromEntries(data.journeys.map((j) => [j.name, j]));
    const thrown = byName["a check that throws"]!;
    expect(thrown.steps.map((s) => [s.name, s.verdict])).toEqual([
      ["the answer has no links, expect", "fail"], ["the answer has no links, expect-equal", "fail"],
      ["the check throws a string", "fail"], ["the check throws a RangeError", "fail"], ["the check returns an object that holds itself", "fail"], ["a step after the throws still runs", "pass"],
    ]);
    expect(thrown.steps[0]!.failures[0]!.message).toContain("reading 'map'");
    expect(byName["a later journey"]!.verdict).toBe("pass");
  });

  it("exits with prove's code for a failing step, 1, not a crash", { timeout: 180_000 }, () => {
    expect(result().out.status).toBe(1);
  });

  it("does not print the answer's values, only its keys, in the output or the report", { timeout: 180_000 }, () => {
    const { text, report } = run(["d-secret.ts"]);
    expect(existsSync(secretFile), "the pick never ran").toBe(true);
    const token = readFileSync(secretFile, "utf8");
    expect(token.length).toBeGreaterThan(8);
    const reported = readFileSync(report, "utf8");
    const line = text.split("\n").find((l) => l.includes('✘ "the pick sees the token and throws":'));
    expect(line, "no failure line").toBeDefined();
    expect(line).toContain("a check threw on an answer with keys [session, token]: TypeError:");
    for (const [where, body] of [["output", text], ["report", reported]] as const) expect(body.includes(token), `the token is in the ${where}`).toBe(false);
    expect(reported).toContain("keys [session, token]");
  });

  // Control, on its own run so it does not depend on the throws: a check that returns false behaves as it always did.
  it("control: a check that returns false is a plain failed step, the run goes on and exits 1", { timeout: 180_000 }, () => {
    const { out, text } = run(["b-control.ts", "c-later.ts"]);
    expect(text).toContain('✘ "the status is not what it says": answer "ok", expected "down"');
    expect(text).toContain("journey a check that returns false ✘ 0/1 steps");
    expect(text).toContain("journey a later journey ✔ 1/1 steps");
    expect(out.status).toBe(1);
  });
});
