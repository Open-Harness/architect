import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";

// A public chain shows every row, so a read of a chain-stored thing is open to anyone (M6-chain item 9).
export default Blueprint.read(Allowance, {
  by: "id",
  fields: ["safe", "member", "token", "limit", "spent", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "500 millis" },
});
