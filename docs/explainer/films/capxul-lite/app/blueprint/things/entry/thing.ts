import { Blueprint } from "orthograph";
import { Usdc } from "../../values/money.ts";

// The books. No `lives`: it gets the project's database.
export const Entry = Blueprint.thing({
  description: "One line of the books.",
  fields: { id: Blueprint.id("ent"), account: Blueprint.text({ max: 64 }), amount: Usdc, postedAt: Blueprint.instant() },
});
