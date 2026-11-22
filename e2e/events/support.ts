// What every check of events in and out shares: the club (examples/signup with a fixture laid over it, and the fixture
// bank installed when it needs one), ortho as a user runs it, prove's lines read back, and the planted journeys.
// The prove helpers are M8's, reused read-only (`../m8/support.ts`): the journey runner's line format is one.
import { cpSync } from "node:fs";
import { join } from "node:path";
import { copyOf, repo } from "../layer1/support.ts";
import { installBank } from "./package.ts";

export { copyOf, nothingRunning, ortho, repo } from "../layer1/support.ts";
export { failedAt, generated, once, passedWhole, plant, prove } from "../m8/support.ts";
export type { Proved } from "../m8/support.ts";

export const signup = join(repo, "examples/signup");
export const fixtures = join(repo, "e2e/fixtures/events");

/**
 * examples/signup copied, with `e2e/fixtures/events/<fixture>` laid over it (its things, handlers, starting worlds and
 * journeys) and the fixture bank installed into its node_modules when `bank` is set. signup's own sheet and journeys
 * stay: they keep coverage whole, and the sheet is the control's thing. Not generated: `generated()` does that, inside
 * the test, so a missing surface fails the test itself.
 */
export const club = (fixture: string, options: { readonly bank?: boolean } = {}) => {
  const copy = copyOf(signup);
  cpSync(join(fixtures, fixture), copy.root, { recursive: true });
  if (options.bank) installBank(copy.root);
  return copy;
};
