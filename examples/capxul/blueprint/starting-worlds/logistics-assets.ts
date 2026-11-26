// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a creditors ledger: Ada has added Assets, a root group of the root type Asset, to Acme Logistics' chart. */
export default Blueprint.startingWorld("logistics assets", {
  from: "a creditors ledger",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Assets", isGroup: true, rootType: "Asset" })],
  gives: (s) => ({ otherAssets: s.last.account }),
});
