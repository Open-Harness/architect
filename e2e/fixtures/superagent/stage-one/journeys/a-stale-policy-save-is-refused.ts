// Checks-author file (Goal 17, slice 6). A builder never edits it (AGENTS.md, "Journeys and checks come first").
// K40 fix 2 (`versions:`) as Policy uses it: every save is a version, one is current, a save made from an older one is refused
// with the current one, and a restore is a save. Policy is keyed by superagent, so each superagent counts its own. The four
// operations are the framework's to serve for a thing with versions (K40: "generated"), so what this journey needs of slice 7 is
// `versions:` at run time. Each version differs from the one before in every field, so a handler that keeps only some of them
// is caught when a version is read back.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { PolicyChanged } from "@orthograph/intake/blueprint/things/policy/events.ts";
import { StaleRevision } from "@orthograph/superagent/blueprint/things/superagent/errors.ts";
import save from "@orthograph/intake/blueprint/things/policy/verbs/save.ts";
import get from "@orthograph/intake/blueprint/things/policy/verbs/get.ts";
import history from "@orthograph/intake/blueprint/things/policy/verbs/history.ts";
import restore from "@orthograph/intake/blueprint/things/policy/verbs/restore.ts";

const rule = { id: "fixable", instruction: "New, reproducible, in our code: accept." };
const first = { mode: "observe", allowed: ["slack:U1"], bots: [] as string[], admission: {}, rules: [] as unknown[] };
const second = { mode: "auto", allowed: [] as string[], bots: ["slack:UB1"], admission: { C1: "explicit" }, rules: [rule] };
const stale = { mode: "off", allowed: [] as string[], bots: [] as string[], admission: {}, rules: [] as unknown[] };

export default Blueprint.journey("a stale policy save is refused", {
  cast: { ada: Blueprint.signedIn },
  // Two real superagents (GOAL17-dead-role-paths): a save for one no world made is refused SuperagentNotFound before any stale check.
  starts: "two-observing-superagents",
  steps: (s) => [
    s.step(
      "ada saves the first version",
      s.ada.run(save, { superagent: s.world.superagent, base: 0n, ...first }),
      expect((a) => a.revision).toBe(1n),
      emits(PolicyChanged, { superagent: s.world.superagent, revision: 1n }),
    ),
    s.step(
      "ada saves a second version, made from the first",
      s.ada.run(save, { superagent: s.world.superagent, base: 1n, ...second }),
      expect((a) => a.revision).toBe(2n),
      emits(PolicyChanged, { superagent: s.world.superagent, revision: 2n }),
    ),
    s.step(
      "a save made from the first version is refused, and says which version is current",
      s.ada.run(save, { superagent: s.world.superagent, base: 1n, ...stale }),
      refuses(StaleRevision, { current: 2n }),
      noEvents(),
    ),
    s.step(
      "a save made from no version at all is refused too, once versions exist",
      s.ada.run(save, { superagent: s.world.superagent, base: 0n, ...stale }),
      refuses(StaleRevision, { current: 2n }),
      noEvents(),
    ),
    s.step(
      "the refused saves changed nothing: the current version is still the second, whole",
      s.ada.run(get, { superagent: s.world.superagent }),
      expect((a) => a.revision).toBe(2n),
      expect((a) => a.mode).toBe("auto"),
      expect((a) => a.allowed).toEqual([]),
      expect((a) => a.bots).toEqual(["slack:UB1"]),
      expect((a) => a.admission).toEqual({ C1: "explicit" }),
      expect((a) => a.rules).toEqual([rule]),
    ),
    s.step(
      "the first version is kept unchanged, and can be read by its number",
      s.ada.run(get, { superagent: s.world.superagent, revision: 1n }),
      expect((a) => a.revision).toBe(1n),
      expect((a) => a.mode).toBe("observe"),
      expect((a) => a.allowed).toEqual(["slack:U1"]),
      expect((a) => a.bots).toEqual([]),
      expect((a) => a.admission).toEqual({}),
      expect((a) => a.rules).toEqual([]),
    ),
    s.step(
      "the history lists both versions, newest first, each with the version it was made from",
      s.ada.run(history, { superagent: s.world.superagent }),
      expect((a) => a.entries.map((e: { revision: number; from: number }) => [e.revision, e.from])).toEqual([[2, 1], [1, 0]]),
      expect((a) => a.entries.map((e: { by: string }) => e.by)).toEqual([s.ada.person, s.ada.person]),
    ),
    s.step(
      "another superagent's policy counts its own versions",
      s.ada.run(save, { superagent: s.world.other, base: 0n, ...first }),
      expect((a) => a.revision).toBe(1n),
    ),
    s.step(
      "ada restores the first version: it is saved again as a third",
      s.ada.run(restore, { superagent: s.world.superagent, revision: 1n, base: 2n }),
      expect((a) => a.revision).toBe(3n),
      emits(PolicyChanged, { superagent: s.world.superagent, revision: 3n }),
    ),
    s.step(
      "the third version holds everything the first did",
      s.ada.run(get, { superagent: s.world.superagent }),
      expect((a) => a.revision).toBe(3n),
      expect((a) => a.mode).toBe("observe"),
      expect((a) => a.allowed).toEqual(["slack:U1"]),
      expect((a) => a.bots).toEqual([]),
      expect((a) => a.admission).toEqual({}),
      expect((a) => a.rules).toEqual([]),
    ),
    s.step(
      "the history now lists three versions, newest first, and the older two keep what they had",
      s.ada.run(history, { superagent: s.world.superagent }),
      expect((a) => a.entries.map((e: { revision: number }) => e.revision)).toEqual([3, 2, 1]),
      expect((a) => a.entries.slice(1).map((e: { from: number }) => e.from)).toEqual([1, 0]),
    ),
    s.step(
      "a restore made from an older version is refused too",
      s.ada.run(restore, { superagent: s.world.superagent, revision: 1n, base: 2n }),
      refuses(StaleRevision, { current: 3n }),
      noEvents(),
    ),
  ],
});
