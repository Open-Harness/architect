import { Blueprint } from "orthograph";
import treasury from "../../stores/treasury.ts";
import { Treasury } from "../treasury/thing.ts";
import { Purpose, usdc } from "../../values/money.ts";

export const Proposal = Blueprint.thing({
  description: "Something a treasury's owners have to agree to. Here: a new budget.",
  fields: {
    id: Blueprint.id("pro"),
    treasury: Treasury.fields.id,
    holder: Blueprint.account(),
    limit: Blueprint.money(usdc),
    purpose: Blueprint.sealed(Purpose), // new
    openedAt: Blueprint.instant(),
  },
  lives: treasury,
});
