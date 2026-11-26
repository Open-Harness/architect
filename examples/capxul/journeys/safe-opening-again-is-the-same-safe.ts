// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// S1 of design/decisions/CX-safe.md (#1168): opening twice gives one Safe. Ada opened hers by her key under the request
// `ada-safe` (`ada has opened her safe`); the same request is the same call, and a new one is refused from every door.
import { Blueprint, Via, expect, noEvents, refuses } from "orthograph";
import { SafeAlreadyOpen } from "../blueprint/things/personal-safe/errors.ts";
import { machine } from "../blueprint/things/personal-safe/machine.ts";
import open from "../blueprint/things/personal-safe/verbs/open.ts";
import get from "../blueprint/things/personal-safe/verbs/get.ts";
import list from "../blueprint/things/personal-safe/verbs/list.ts";
import { saltProblem } from "./support/safe-address.ts";

export default Blueprint.journey("safe: opening again is the same safe", {
  cast: { ada: Blueprint.signedIn, nobody: Blueprint.system },
  starts: "ada has opened her safe",
  steps: (s) => [
    s.step(
      "her first request again, by her key, is the same call: the Safe she was answered, and nothing new",
      s.ada.via(Via.key).run(open, {}, { request: "ada-safe" }),
      expect((a) => a.safe).toBe(s.world.adaSafe),
      noEvents(),
      machine.isIn(s.world.adaSafe, "unclaimed"),
    ),
    s.step(
      "that Safe is hers, unclaimed, with her salt nonce",
      s.ada.run(get, { id: s.world.adaSafe }),
      expect((a) => [a.person, a.account ?? "none", a.state]).toEqual([s.ada.person, "none", "unclaimed"]),
      expect((a) => saltProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "a new request by her key is refused",
      s.ada.via(Via.key).run(open, {}),
      refuses(SafeAlreadyOpen, { person: s.ada.person }),
      noEvents(),
    ),
    s.step(
      "and in her own session",
      s.ada.run(open, {}),
      refuses(SafeAlreadyOpen, { person: s.ada.person }),
      noEvents(),
    ),
    s.step(
      "and through her agent",
      s.ada.via(Via.agent).run(open, {}),
      refuses(SafeAlreadyOpen, { person: s.ada.person }),
      noEvents(),
    ),
    s.step(
      "the system lists that one Safe for Ada, and no other",
      s.nobody.run(list, { person: s.ada.person }),
      expect((p) => p.items.map((i: { readonly id: string; readonly person: string }) => [i.id, i.person])).toEqual([[s.world.adaSafe, s.ada.person]]),
      noEvents(),
    ),
  ],
});
