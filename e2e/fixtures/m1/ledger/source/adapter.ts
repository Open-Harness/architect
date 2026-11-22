import { Blueprint } from "orthograph";
import { LedgerUnavailable } from "./blueprint/things/ledger/errors.js";

// A second adapter beside `@fixture/remote`, with a thing, a code and an error of its own, so both mount in one app (M2-auth, fork 3: a service is one mount).
export default Blueprint.adapter({
  description: "Posts to a remote ledger, called as a plain Promise function.",
  choices: {},
  calls: { post: Blueprint.call({ mode: "promise", errors: [LedgerUnavailable] }) },
});
