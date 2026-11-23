// Journey-author file. The builder of locker.install and locker.open never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import { machine } from "../blueprint/things/locker/machine.ts";
import { LockerInstalled, LockerOpened } from "../blueprint/things/locker/events.ts";
import { LockerSealed } from "../blueprint/things/locker/errors.ts";
import install from "../blueprint/things/locker/verbs/install.ts";
import open from "../blueprint/things/locker/verbs/open.ts";
import get from "../blueprint/things/locker/verbs/get.ts";

// `s.last` in a payload is the answer of the latest call that succeeded; a refused call leaves it alone.
export default Blueprint.journey("open a locker", {
  // ada owns the founded organisation; bob is signed in and owns nothing there.
  cast: { ada: owner, bob: Blueprint.signedIn },
  starts: "founded",
  steps: (s) => [
    s.step(
      "ada puts a locker in her organisation",
      s.ada.run(install, { organization: s.world.organization, label: "Spare keys" }),
      expect((a) => a.locker).toMatch(/^lkr_[0-9a-z]+$/),
      emits(LockerInstalled, { locker: s.last.locker, label: "Spare keys" }),
      machine.isIn(s.last.locker, "closed"),
    ),
    s.step(
      "the crowbar is refused, and nothing is committed",
      s.ada.run(open, { locker: s.last.locker, tool: "crowbar" }),
      refuses(LockerSealed),
      noEvents(),
    ),
    s.step(
      "bob is refused the same way",
      s.bob.run(open, { locker: s.last.locker, tool: "crowbar" }),
      refuses(LockerSealed),
      noEvents(),
    ),
    s.step(
      "ada opens it with the key",
      s.ada.run(open, { locker: s.last.locker, tool: "key" }),
      expect((a) => a.label).toBe("Spare keys"),
      emits(LockerOpened, { label: "Spare keys" }),
      machine.isIn(s.last.locker, "opened"),
    ),
    s.step(
      "bob reads it and sees what the public sees",
      s.bob.run(get, { id: s.last.locker }),
      expect((a) => a.label).toBe("Spare keys"),
      expect((a) => a.state).toBe("opened"),
      noEvents(),
    ),
  ],
});
