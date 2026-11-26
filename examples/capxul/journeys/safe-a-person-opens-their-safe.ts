// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// S1 of design/decisions/CX-safe.md (#1168), the person's Safe's machine: a person opens their own Safe, from the
// command line (`Via.key`, the CLI's way in) and through MCP (`Via.agent`, an agent's), and it has no owner and no
// address until it is claimed. Cy opens hers in her own session, so every way in opens one. The salt nonce is judged by support/safe-address.ts, never by the answer.
import { Blueprint, Via, emits, expect, has, noEvents, refuses, spans } from "orthograph";
import { PersonalSafeOpened } from "../blueprint/things/personal-safe/events.ts";
import { SafeAlreadyOpen } from "../blueprint/things/personal-safe/errors.ts";
import { machine } from "../blueprint/things/personal-safe/machine.ts";
import open from "../blueprint/things/personal-safe/verbs/open.ts";
import get from "../blueprint/things/personal-safe/verbs/get.ts";
import list from "../blueprint/things/personal-safe/verbs/list.ts";
import { saltProblem } from "./support/safe-address.ts";

type Item = { readonly person: string; readonly saltNonce: bigint; readonly signer?: string; readonly account?: string; readonly state: string };

export default Blueprint.journey("safe: a person opens their safe", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn, cy: Blueprint.signedIn, nobody: Blueprint.system },
  steps: (s) => [
    s.step(
      "the system can't open a Safe: it is nobody",
      s.nobody.run(open, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["personal-safe.open.refused"], absent: ["personal-safe.open"] }),
    ),
    s.step(
      "Ada opens her own Safe from the command line",
      s.ada.via(Via.key).run(open, {}, { request: "ada-safe" }),
      expect((a) => a.safe).toMatch(/^saf_[0-9a-z]+$/),
      emits(PersonalSafeOpened, { safe: s.last.safe, person: s.ada.person }),
      machine.isIn(s.last.safe, "unclaimed"),
      spans({ present: ["personal-safe.open", "personal-safe.open.insert"] }),
    ),
    s.step(
      "Bo can't read Ada's Safe",
      s.bo.run(get, { id: s.last.safe }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada reads it back: hers, unclaimed, with her salt nonce, and no signer, owner or address yet",
      s.ada.run(get, { id: s.last.safe }),
      expect((a) => [a.person, a.signer ?? "none", a.firstOwner ?? "none", a.account ?? "none", a.state]).toEqual([
        s.ada.person, "none", "none", "none", "unclaimed",
      ]),
      expect((a) => saltProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "a second open, a new request, is refused: a person has one Safe",
      s.ada.run(open, {}),
      refuses(SafeAlreadyOpen, { person: s.ada.person }),
      noEvents(),
    ),
    s.step(
      "nor through her agent",
      s.ada.via(Via.agent).run(open, {}),
      refuses(SafeAlreadyOpen, { person: s.ada.person }),
      noEvents(),
    ),
    s.step(
      "Bo's agent opens Bo's own Safe through MCP: his, not Ada's",
      s.bo.via(Via.agent).run(open, {}),
      expect((a) => a.safe).toMatch(/^saf_[0-9a-z]+$/),
      emits(PersonalSafeOpened, { safe: s.last.safe, person: s.bo.person }),
      machine.isIn(s.last.safe, "unclaimed"),
    ),
    s.step(
      "Ada can't read Bo's",
      s.ada.run(get, { id: s.last.safe }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo's agent reads it back: Bo's, unclaimed, with his own salt nonce",
      s.bo.via(Via.agent).run(get, { id: s.last.safe }),
      expect((a) => [a.person, a.signer ?? "none", a.firstOwner ?? "none", a.account ?? "none", a.state]).toEqual([
        s.bo.person, "none", "none", "none", "unclaimed",
      ]),
      expect((a) => saltProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "a second open from Bo, in his own session, is refused too",
      s.bo.run(open, {}),
      refuses(SafeAlreadyOpen, { person: s.bo.person }),
      noEvents(),
    ),
    s.step(
      "Cy opens her own Safe in her own session",
      s.cy.run(open, {}),
      expect((a) => a.safe).toMatch(/^saf_[0-9a-z]+$/),
      emits(PersonalSafeOpened, { safe: s.last.safe, person: s.cy.person }),
      machine.isIn(s.last.safe, "unclaimed"),
      spans({ present: ["personal-safe.open", "personal-safe.open.insert"] }),
    ),
    s.step(
      "Cy reads it back: hers, unclaimed, with her salt nonce, and no signer, owner or address yet",
      s.cy.run(get, { id: s.last.safe }),
      expect((a) => [a.person, a.signer ?? "none", a.firstOwner ?? "none", a.account ?? "none", a.state]).toEqual([
        s.cy.person, "none", "none", "none", "unclaimed",
      ]),
      expect((a) => saltProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Cy can't list the Safes: only the system can",
      s.cy.run(list, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    ...([["Ada", s.ada], ["Bo", s.bo], ["Cy", s.cy]] as const).map(([name, who]) =>
      s.step(
        `${name}'s open wrote one Safe for ${name}, and no second`,
        s.nobody.run(list, { person: who.person }),
        expect((p) => p.items.map((i: Item) => [i.person, i.signer ?? "none", i.account ?? "none", i.state, saltProblem(i)])).toEqual([
          [who.person, "none", "none", "unclaimed", ""],
        ]),
        noEvents(),
      ),
    ),
    s.step(
      // Journeys share the world, so this is every Safe any journey opened: none may be malformed. An open that also
      // writes a well-formed Safe for a person who doesn't exist is beyond what a journey can see (no stable count).
      "no Safe in the world holds a salt nonce that isn't its own person's",
      s.nobody.run(list, {}),
      expect((p) => p.items.map((i: Item) => saltProblem(i)).filter((x: string) => x !== "")).toEqual([]),
      noEvents(),
    ),
    s.step(
      "an agent's MCP tools hold opening and reading a Safe",
      s.bo.via(Via.agent).tools(),
      has(open, get),
    ),
  ],
});
