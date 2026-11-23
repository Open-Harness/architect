// Journey-author file. The builder of lamp.glow never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, spans } from "orthograph";
import { machine } from "../blueprint/things/lamp/machine.ts";
import { LampLit } from "../blueprint/things/lamp/events.ts";
import glow from "../blueprint/things/lamp/verbs/glow.ts";

export default Blueprint.journey("a lamp glows", {
  cast: { visitor: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "anyone lights a lamp",
      s.visitor.run(glow, { origin: "none" }),
      expect((a) => a.lamp).toMatch(/^lmp_[0-9a-z]+$/),
      emits(LampLit, { lamp: s.last.lamp }),
      machine.isIn(s.last.lamp, "lit"),
      spans({ present: ["lamp.glow", "lamp.glow.wait", "lamp.glow.save"] }),
    ),
  ],
});
