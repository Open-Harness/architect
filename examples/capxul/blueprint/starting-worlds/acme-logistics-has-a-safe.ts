// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint, Via } from "orthograph";
import { owner } from "../things/company/roles.ts";
import recordCompany from "../things/safe/verbs/record-company.ts";

/** From acme trading has a safe: Ada has recorded Acme Logistics' Safe from the command line (her key). */
export default Blueprint.startingWorld("acme logistics has a safe", {
  from: "acme trading has a safe",
  cast: { ada: owner },
  makes: (s) => [s.ada.via(Via.key).run(recordCompany, { company: s.world.otherCompany })],
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
    logisticsSafe: s.last.safe,
    logisticsAccount: s.last.account,
  }),
});
