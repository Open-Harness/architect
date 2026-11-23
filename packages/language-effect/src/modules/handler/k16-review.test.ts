// K16 review, PR #76 at 7430e023 (checks ahead of their fix, written by the ✍️ author; a builder never edits this file
// or test/fixtures/created-id/). Check 22 in e2e/m1/22-k16-review.test.ts holds the other four.
//  2. P2 (MAC-08). `context.id` is the minted id for a creating move and undefined for a move from a state, in the type as
//     at runtime: a machine's `from` kept as an array let allowance.spend's handler read an id it is never given.
//  3. P2. The context a handler is typed with is the one it gets on every path: `refs` is required, so a handler served
//     on the device (Device.serve, M1.27) is handed it too, as over HTTP. No store on the device, so nothing is read: an
//     empty `refs`, never a missing one.
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Device } from "./service.ts";
import type { Handler } from "./types.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const fixture = join(repo, "packages/language-effect/test/fixtures/created-id");
// `--pretty false`: with FORCE_COLOR (CI) tsc colours "error" and "TS" apart, a filter on "error TS" finds nothing, and the test passes vacuously.
const compile = () => spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "-p", join(fixture, "tsconfig.json")], { cwd: repo, encoding: "utf8" });

describe("K16 review 2 (MAC-08): a handler's id is there only when its move creates", () => {
  it("compiles: open's id is the purse's id, spend's and resume's are undefined, and none is any", { timeout: 60_000 }, () => {
    const result = compile();
    const errors = result.stdout.split("\n").filter((l) => l.includes("error TS"));
    // tsc that dies, or is killed, without printing an error line is not a clean compile.
    if (result.status !== 0 && errors.length === 0) errors.push(`tsc exited ${String(result.status)} with no error line: ${result.stdout}${result.stderr}`);
    // The fixture's own setup (the machine, the operations) compiles today; only the three typed lines may fail.
    expect(errors.filter((l) => !/ids\.ts\((3[5-9]|4[0-2]),/.test(l)), "the fixture itself").toEqual([]);
    expect(errors, "a move from a state is typed as handing in an id it never gets").toEqual([]);
  });
});

const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
const Note = Blueprint.thing({ description: "A note for someone.", fields: { id: Blueprint.id("not"), to: Person.fields.id } });
const scribble = Blueprint.operation(Note, {
  description: "Scribble a note to someone, on the device.",
  payload: { to: Note.fields.to, text: Blueprint.text({ max: 64 }) },
  answer: { refs: Blueprint.text({ max: 64 }) },
  allowed: [Blueprint.anyone],
  runs: "client",
});

describe("K16 review 3: Device.serve hands a handler the context its type promises", () => {
  it("control: a device handler that reads only its payload answers", async () => {
    const handler: Handler<typeof scribble> = ({ text }) => Effect.succeed({ refs: text });
    const served = Device.serve({ name: "note.scribble", operation: scribble, handler });
    const answer = await Effect.runPromise(served.run({ to: "per_ada" as typeof Person.fields.id.value.schema.Type, text: "hi" }, { otlp: undefined, service: "test" }));
    expect(answer).toEqual({ refs: "hi" });
  });

  it("a device handler that reads refs is handed them, so it answers rather than dying", async () => {
    const handler: Handler<typeof scribble> = (_payload, { refs }) => Effect.succeed({ refs: typeof refs === "object" && refs !== null ? "given" : "missing" });
    const served = Device.serve({ name: "note.scribble", operation: scribble, handler });
    const answer = await Effect.runPromise(served.run({ to: "per_ada" as typeof Person.fields.id.value.schema.Type, text: "hi" }, { otlp: undefined, service: "test" }));
    expect(answer).toEqual({ refs: "given" });
  });
});
