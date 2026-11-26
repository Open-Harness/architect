// `ortho prove --only`: a green run of one journey ends green. It used to end `prove ✘ N failing`, because coverage counted every
// operation the one journey did not reach, and it refused the journey's file, which is how `ortho brief` lists the journeys to run.
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { Owned } from "@orthograph/services";
import { acmeCopy } from "../../../test/acme.ts";
import type { Verdict } from "#modules/evals/types.js";
import type { Project } from "#modules/journeys/types.js";
import { chosen, noJourney, unknownOf } from "./internal/only.ts";
import { evalLines } from "./internal/report.ts";
import { Prove } from "./service.ts";

const journey = (name: string) => ({ kind: "journey", name, cast: {}, starts: undefined, steps: () => [] }) as never;
const project = { journeys: [journey("claim a handle"), journey("release a handle")], journeyFiles: ["journeys/claim-a-handle.ts", "blueprint/journeys/release.ts"] } as unknown as Project;

describe("--only names a journey by its declared name or by its file", () => {
  it("takes the name, the file as brief lists it, and the file with a leading ./", () => {
    for (const said of ["claim a handle", "journeys/claim-a-handle.ts", "./journeys/claim-a-handle.ts"]) {
      const picked = chosen(project, [said]);
      expect([picked.journeys.map((j) => j.name), picked.journeyFiles], said).toEqual([["claim a handle"], ["journeys/claim-a-handle.ts"]]);
      expect(unknownOf(project, [said]), said).toBeUndefined();
    }
  });

  it("keeps the files in step with the journeys, each journey once and in file order", () => {
    const picked = chosen(project, ["blueprint/journeys/release.ts", "release a handle", "claim a handle"]);
    expect([picked.journeys.map((j) => j.name), picked.journeyFiles]).toEqual([["claim a handle", "release a handle"], ["journeys/claim-a-handle.ts", "blueprint/journeys/release.ts"]]);
  });

  it("refuses what is neither, saying both ways to name one", () => {
    expect(unknownOf(project, ["claim a handle", "journeys/nope.ts"])).toBe("journeys/nope.ts");
    expect(chosen(project, ["claim-a-handle"]).journeys).toEqual([]);
    expect(noJourney("nope")).toBe('no journey named "nope": name one by its declared name or by its file, as ortho model lists them');
  });
});

describe("a run that left journeys out does not judge coverage", () => {
  const model = { operations: { "link.add": {}, "link.order": {} } } as unknown as Model;
  const verdicts: ReadonlyArray<Verdict> = [
    { eval: "events", operation: "link.add", failures: [], notes: [] },
    { eval: "coverage", operation: "link.add", failures: ["move link.add made by no journey"], notes: [] },
    { eval: "coverage", operation: "link.order", failures: ["link.order reached by no journey"], notes: [] },
  ];

  it("a whole run counts each operation's coverage gap as failing, as before", () => {
    const said = evalLines(model, verdicts);
    expect(said.failed).toBe(2);
    expect(said.lines).toContain("link.add coverage ✘ move link.add made by no journey");
    expect(said.lines).toContain("link.add 1 of 2 evals ✘");
  });

  it("a partial run says what it did not reach, without a ✘ and without counting it", () => {
    const said = evalLines(model, verdicts, true);
    expect([said.failed, said.unjudged]).toEqual([0, 2]);
    expect(said.lines).toEqual([
      "link.add events ✔",
      "link.add coverage not judged: move link.add made by no journey",
      "link.add 1 evals ✔, coverage not judged",
      "link.order coverage not judged: link.order reached by no journey",
      "link.order 0 evals ✔, coverage not judged",
    ]);
  });

  it("a partial run still fails on any other eval", () => {
    const said = evalLines(model, [...verdicts, { eval: "steps", operation: "link.add", failures: ["step record never ran"], notes: [] }], true);
    expect(said.failed).toBe(1);
    expect(said.lines).toContain("link.add steps ✘ step record never ran");
    expect(said.lines).toContain("link.add 1 of 3 evals ✘");
  });
});

describe("ortho prove --only on acme", () => {
  const own = acmeCopy();
  afterAll(() => own.remove());
  const prove = (only: string) => Effect.runPromise(Effect.scoped(Prove.run({ root: own.root, port: 0, only })));

  it("a green journey named by its file ends prove ✔, saying what it left out", { timeout: 180_000 }, async () => {
    const report = await prove("journeys/health-is-up.ts");
    expect(report.lines.filter((l) => l.startsWith("journey "))).toEqual(["journey health is up ✔ 1/1 steps"]);
    expect(report.lines.some((l) => / coverage not judged: .* reached by no journey$/.test(l))).toBe(true);
    expect(report.lines.some((l) => l.includes("✘"))).toBe(false);
    expect(report.lines.at(-2)).toMatch(/^ran 1 of \d+ journeys \(--only\): coverage is judged by the whole run, ortho prove; \d+ operations above not reached in full by this one$/);
    expect(report.lines.at(-1)).toBe("prove ✔");
    expect(report.passed).toBe(true);
    expect(report.structured.journeys.map((j) => [j.name, j.verdict])).toEqual([["health is up", "pass"]]);
    expect(Owned.leaks().filter((m) => m.owner === process.pid)).toEqual([]);
  });

  it("a name that is no journey's name or file is refused before any world starts", { timeout: 60_000 }, async () => {
    const said = await Effect.runPromise(Effect.scoped(Prove.run({ root: own.root, port: 0, only: "journeys/no-such.ts" })).pipe(Effect.flip));
    expect(said.message).toContain('no journey named "journeys/no-such.ts"');
  });
});
