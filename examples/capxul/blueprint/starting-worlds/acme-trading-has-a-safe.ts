// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint, Via } from "orthograph";
import { owner } from "../things/company/roles.ts";
import recordCompany from "../things/safe/verbs/record-company.ts";

/** From ada and bo have safes: Ada's agent has recorded Acme Trading's Safe through MCP, under the request `acme-trading-safe`. */
export default Blueprint.startingWorld("acme trading has a safe", {
  from: "ada and bo have safes",
  cast: { ada: owner },
  makes: (s) => [s.ada.via(Via.agent).run(recordCompany, { company: s.world.company }, { request: "acme-trading-safe" })],
  gives: (s) => ({
    company: s.world.company,
    otherCompany: s.world.otherCompany,
    boCompany: s.world.boCompany,
    adaSafe: s.world.adaSafe,
    adaAccount: s.world.adaAccount,
    boSafe: s.world.boSafe,
    boAccount: s.world.boAccount,
    tradingSafe: s.last.safe,
    tradingAccount: s.last.account,
  }),
});
