// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import recordCompany from "../things/safe/verbs/record-company.ts";

/** From acme logistics has a safe: Bo has recorded Bo Ltd's Safe in his own session. Each company has its Safe, each recorded by another way in. */
export default Blueprint.startingWorld("three company safes", {
  from: "acme logistics has a safe",
  cast: { bo: owner },
  makes: (s) => [s.bo.run(recordCompany, { company: s.world.boCompany })],
  gives: (s) => ({
    company: s.world.company,
    otherCompany: s.world.otherCompany,
    boCompany: s.world.boCompany,
    adaSafe: s.world.adaSafe,
    adaAccount: s.world.adaAccount,
    boSafe: s.world.boSafe,
    boAccount: s.world.boAccount,
    tradingSafe: s.world.tradingSafe,
    tradingAccount: s.world.tradingAccount,
    logisticsSafe: s.world.logisticsSafe,
    logisticsAccount: s.world.logisticsAccount,
    boLtdSafe: s.last.safe,
    boLtdAccount: s.last.account,
  }),
});
