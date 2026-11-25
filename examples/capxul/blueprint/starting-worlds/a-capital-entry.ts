// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createEntry from "../things/journal-entry/verbs/create.ts";

/**
 * From a fiscal year: Ada has drafted Acme Trading's opening capital, dated Thursday 15 January 2026: Bank debited and
 * Capital Stock credited 10,000 USDC, both in Operations. It is still a draft.
 */
export default Blueprint.startingWorld("a capital entry", {
  from: "a fiscal year",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createEntry, {
      company: s.world.company,
      postingDate: "2026-01-15",
      userRemark: "Opening capital",
      lines: [
        { account: s.world.bank, costCenter: s.world.costCenter, debit: 10_000_000_000n, credit: 0n },
        { account: s.world.capital, costCenter: s.world.costCenter, debit: 0n, credit: 10_000_000_000n },
      ],
    }),
  ],
  gives: (s) => ({ journalEntry: s.last.journalEntry }),
});
