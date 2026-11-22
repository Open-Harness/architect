// Journey-author file (M8.04). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { PurseRefilled, PurseSpent } from "../blueprint/things/purse/events.ts";
import { PurseExceeded } from "../blueprint/things/purse/errors.ts";
import spend from "../blueprint/things/purse/verbs/spend.ts";
import get from "../blueprint/things/purse/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}`);

export default Blueprint.journey("a lazy refill is worked out at the next spend", {
  cast: { aaron: Blueprint.anyone },
  starts: "purse-opened",
  steps: (s) => [
    s.step(
      "60 of 100 spent in January",
      s.aaron.run(spend, { purse: s.world.purse, amount: 60n }, { request: "spend-january" }),
      expect((a) => a.left).toBe(40n),
      emits(PurseSpent, { purse: s.world.purse, left: 40n }),
    ),
    s.step(
      "a month passes: the keeper fires nothing for a lazy move",
      s.clock.advance("1 month"),
      expect((a) => a.now).toBe("2027-02-10T09:00:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "a read is not a use: nothing is worked out",
      s.aaron.run(get, { id: s.world.purse }),
      expect((a) => [a.limit, a.spent, a.period]).toEqual([100n, 60n, 1n]),
      noEvents(),
    ),
    s.step(
      "the next spend works out the refill first, then spends from a fresh month",
      s.aaron.run(spend, { purse: s.world.purse, amount: 50n }, { request: "spend-february" }),
      expect((a) => a.left).toBe(50n),
      emits(PurseRefilled, { purse: s.world.purse, period: 2n }),
      emits(PurseSpent, { purse: s.world.purse, left: 50n }),
    ),
    s.step(
      "the refill is worked out once a month: the next spend over what is left is refused",
      s.aaron.run(spend, { purse: s.world.purse, amount: 60n }, { request: "spend-february-again" }),
      refuses(PurseExceeded, { left: 50n }),
      noEvents(),
    ),
    s.step(
      "three months pass with no spend",
      s.clock.advance("3 months"),
      expect((a) => a.now).toBe("2027-05-10T09:00:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "the next spend works out one refill, for May, not three",
      s.aaron.run(spend, { purse: s.world.purse, amount: 10n }, { request: "spend-may" }),
      expect((a) => a.left).toBe(90n),
      emits(PurseRefilled, { purse: s.world.purse, period: 5n }),
      emits(PurseSpent, { purse: s.world.purse, left: 90n }),
    ),
    s.step(
      "read back",
      s.aaron.run(get, { id: s.world.purse }),
      expect((a) => [a.limit, a.spent, a.period]).toEqual([100n, 10n, 5n]),
      noEvents(),
    ),
  ],
});
