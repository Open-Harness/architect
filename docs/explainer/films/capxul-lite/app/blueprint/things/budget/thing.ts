import { Blueprint } from "orthograph";
import treasury from "../../stores/treasury.ts";
import { Treasury } from "../treasury/thing.ts";
import { usdc } from "../../values/money.ts";

export const Budget = Blueprint.thing({
  description: "Money someone may spend from a treasury each month, without asking.",
  fields: {
    id: Blueprint.id("bud"),
    treasury: Treasury.fields.id,
    holder: Blueprint.account(), // a person's wallet, or an agent's
    limit: Blueprint.money(usdc),
    spent: Blueprint.money(usdc),
    startedAt: Blueprint.instant(),
  },
  lives: treasury,
});
