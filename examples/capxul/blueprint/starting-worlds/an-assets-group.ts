// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From two companies: Ada has started Acme Trading's chart with Assets, a root group of the root type Asset. */
export default Blueprint.startingWorld("an assets group", {
  from: "two companies",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.company, accountName: "Assets", isGroup: true, rootType: "Asset" })],
  gives: (s) => ({ assets: s.last.account }),
});
