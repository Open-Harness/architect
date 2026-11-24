// Checks-author file (#900, check 25). A builder never edits it. It runs on a copy of examples/superagent in which Policy's save and
// restore declare `PolicyOutOfDate { current }` (in `policy/errors.ts`, which the check writes) where the app has `StaleRevision`: a thing
// with versions in an app whose stale refusal has another name. Each stale save and restore is refused with that app's own error.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { PolicyChanged } from "@orthograph/intake/blueprint/things/policy/events.ts";
// Written into the copy by check 25: no such file in the app.
import { PolicyOutOfDate } from "@orthograph/intake/blueprint/things/policy/errors.ts";
import save from "@orthograph/intake/blueprint/things/policy/verbs/save.ts";
import restore from "@orthograph/intake/blueprint/things/policy/verbs/restore.ts";

const A = "sag_elsewhere1";
const policy = { mode: "observe", allowed: ["slack:U1"], bots: [] as string[], admission: {}, rules: [] as unknown[] };

export default Blueprint.journey("a stale save under another name is refused", {
  cast: { ada: Blueprint.signedIn },
  steps: (s) => [
    s.step("ada saves the first version", s.ada.run(save, { superagent: A, base: 0n, ...policy }), expect((a) => a.revision).toBe(1n), emits(PolicyChanged, { superagent: A, revision: 1n })),
    s.step("ada saves a second, made from the first", s.ada.run(save, { superagent: A, base: 1n, ...policy, mode: "auto" }), expect((a) => a.revision).toBe(2n)),
    s.step("a save made from the first is refused with the app's own error, naming the current version", s.ada.run(save, { superagent: A, base: 1n, ...policy, mode: "off" }), refuses(PolicyOutOfDate, { current: 2n }), noEvents()),
    s.step("a restore made from the first is refused the same way", s.ada.run(restore, { superagent: A, revision: 1n, base: 1n }), refuses(PolicyOutOfDate, { current: 2n }), noEvents()),
    s.step("a restore from the current version is saved as a third", s.ada.run(restore, { superagent: A, revision: 1n, base: 2n }), expect((a) => a.revision).toBe(3n)),
  ],
});
