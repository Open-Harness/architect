// Check 02 (M4.10, and Gate M4 item 1): the agents journeys pass, mounted in acme. `ortho prove` runs the fixture's twelve
// journeys in worlds of their own, on the stand-in model (Models.standIn, Qwen3 0.6B at temperature 0 on llama.cpp: no
// key, no cloud). Each must report `✔ n/n steps` exactly, with its step count written here and nothing skipped.
//
// What each proves, in one line (the journeys' own prose says it in words):
//   starts     a run starts, reads back working and unspent, finishes `answered`, and has paid for one reply
//   steers     a note reaches the transcript, in order, and the run stays working
//   cancels    a cancel ends the run, and a late model reply starts no tool and no request
//   budget     a budget below one reply fails the run `budget` and not transient, with nothing sent or spent
//   evictTool  an eviction in the tool phase makes no extra model request (frame journey 5, M4-agents call 3)
//   evictModel an eviction with a reply held repeats exactly that request, none committed, and pays once
//   starter    only the starter steers or cancels
//   person     an agent is refused `allowance.revoke` exactly as Bob is, and does it as an agent for Ada
//   gate       the support agent spends 120 from Bob's allowance as an agent for Bob; invitation.accept is no tool
//              and is refused to an agent key for Bob
//   key        the same `key` twice starts one run; another key starts another
//   closed     only the system finishes or fails a run; four outcomes and seven reasons, no other; transient as K10 says
//   pool       a full pool refuses `RunPoolFull`, a free slot admits
//
// Red today: the fixture does not load (no `@orthograph/agents`), so prove never starts and there is no journey line.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme } from "../../m8/support.ts";
import { generated, JOURNEYS, nothingRunning, once, passedWhole, prove, shop } from "./support.ts";

const acmeJourneys = readdirSync(join(acme, "journeys")).filter((f) => f.endsWith(".ts")).length;
const project = shop("support");
afterAll(() => project.remove());

/** The fixture's one prove, shared by every test of this file. */
const proved = once(() => prove(generated(project.root)));

describe("02 M4.10: the agents journeys pass, mounted in acme", () => {
  for (const [key, journey] of Object.entries(JOURNEYS)) {
    it(`${key}: "${journey.name}" passes all ${journey.steps} steps`, () => {
      passedWhole(proved(), journey.name, journey.steps);
    });
  }

  it("no journey of the fixture fails or is left out, acme's own journeys still pass, and the prove ends well", () => {
    const run = proved();
    expect(run.lines.filter((l) => l.startsWith("journey ") && !l.includes(" ✔ ")), run.out).toEqual([]);
    const names = run.lines.filter((l) => l.startsWith("journey ")).length;
    expect(names, run.out).toBe(Object.keys(JOURNEYS).length + acmeJourneys); // acme's own journeys stay beside these
    expect(run.status, run.out).toBe(0);
    expect(run.lines.filter((l) => l !== "").at(-1)).toMatch(/^prove ✔/);
  });

  it("nothing this prove started is left running: no world, no stand-in model server", () => {
    expect(proved().status).toBe(0);
    nothingRunning(project.root);
  });
});
