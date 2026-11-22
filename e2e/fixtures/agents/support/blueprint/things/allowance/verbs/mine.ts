// Journey-author file (M4.02). A read of the allowances the caller may see (a grantee's own, an owner's organisation's),
// so an agent can find the id a spend or a revoke needs without being told it.
import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { grantee } from "../roles.ts";
import { owner } from "../../organization/roles.ts";

export default Blueprint.read(Allowance, {
  where: [],
  order: "oldest",
  page: 50,
  allowed: [grantee, owner.of("organization")],
  budget: { p95: "80 millis" },
});
