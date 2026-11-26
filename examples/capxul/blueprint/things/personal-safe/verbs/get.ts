import { Blueprint } from "orthograph";
import { PersonalSafe } from "../thing.ts";
import { holder } from "../roles.ts";

// A read. It answers from the Safe's record, to the person whose Safe it is.
export default Blueprint.read(PersonalSafe, {
  by: "id",
  fields: ["person", "saltNonce", "signer", "firstOwner", "account", "state"],
  allowed: [holder],
  budget: { p95: "50 millis" },
});
