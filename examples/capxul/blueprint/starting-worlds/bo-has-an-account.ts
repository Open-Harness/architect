// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import approve from "../things/bridge-business/verbs/approve.ts";
import open from "../things/bank-account/verbs/open.ts";

/** From two kybs started: Bridge has approved both KYBs, and Bo has opened Bo Ltd's US dollar account, the first in the world. */
export default Blueprint.startingWorld("bo has an account", {
  from: "two kybs started",
  cast: { bo: owner, bridge: Blueprint.system },
  makes: (s) => [
    s.bridge.run(approve, { business: s.world.business }, { request: "approve-acme" }),
    s.bridge.run(approve, { business: s.world.boBusiness }, { request: "approve-bo" }),
    s.bo.run(open, { business: s.world.boBusiness, accountName: "Bo Main", currency: "USD" }, { request: "bo-main" }),
  ],
  gives: (s) => ({ company: s.world.company, business: s.world.business, boBusiness: s.world.boBusiness, boAccount: s.last.account }),
});
