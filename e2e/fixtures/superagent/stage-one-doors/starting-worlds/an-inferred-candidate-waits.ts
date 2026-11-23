// Checks-author file (Goal 17, slice 6). A builder never edits it.
// From an observing superagent: ada's first policy is `observe` with the row's no-sender cell set to inferred, and a message with no sender
// (a build finished) has been stored: an inferred candidate, waiting for an eval.
import { Blueprint } from "orthograph";
import save from "@orthograph/intake/blueprint/things/policy/verbs/save.ts";
import receive from "@orthograph/intake/blueprint/things/trigger/verbs/receive.ts";

export default Blueprint.startingWorld("an-inferred-candidate-waits", {
  from: "an-observing-superagent",
  cast: { ada: Blueprint.signedIn, source: Blueprint.system },
  makes: (s) => [
    s.ada.run(save, { superagent: s.world.superagent, base: 0n, mode: "observe", allowed: [], bots: [], admission: { C1: { unnamed: "inferred" } }, rules: [{ id: "fixable", instruction: "A failing build on main: accept." }] }),
    s.source.run(receive, { superagent: s.world.superagent, source: "slack", event: "EvBuild1", thread: "C1:40.1", kind: "message", text: "build 812 failed on main", channel: { channel: "C1", ts: "40.1" } }),
  ],
  gives: (s) => ({ trigger: s.last.trigger }),
});
