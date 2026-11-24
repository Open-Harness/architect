// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, expect, noEvents } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import get from "../blueprint/things/bank-account/verbs/get.ts";

export default Blueprint.journey("bridge: a reopened account is its own", {
  // Ada closed Operating and opened a new account under its name.
  cast: { ada: owner },
  starts: "a reopened account",
  steps: (s) => [
    s.step(
      "the new account reads back with the details its opening answered",
      s.ada.run(get, { id: s.world.account }),
      expect((a) => [a.company, a.business, a.accountName, a.currency, a.bankName, a.accountNumber, a.routingNumber, a.state]).toEqual([
        s.world.company,
        s.world.business,
        "Operating",
        "USD",
        s.world.bankName,
        s.world.accountNumber,
        s.world.routingNumber,
        "open",
      ]),
      noEvents(),
    ),
    s.step(
      "the old one is closed, and keeps its own number",
      s.ada.run(get, { id: s.world.old }),
      expect((a) => [a.accountNumber, a.state]).toEqual([s.world.oldAccountNumber, "closed"]),
      noEvents(),
    ),
  ],
});
