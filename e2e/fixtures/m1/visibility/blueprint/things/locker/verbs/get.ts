import { Blueprint } from "orthograph";
import { Locker } from "../thing.ts";
import { owner } from "../../organization/roles.ts";

// A read of the whole thing: the same three visibilities, with no handler to narrow them.
export default Blueprint.read(Locker, {
  by: "id",
  fields: ["label", "note", "code", "state"],
  allowed: [owner.of("organization"), Blueprint.anyone],
  budget: { p95: "50 millis" },
});
