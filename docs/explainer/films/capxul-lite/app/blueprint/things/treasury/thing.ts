import { Blueprint } from "orthograph";
import treasury from "../../stores/treasury.ts";
import { usdc } from "../../values/money.ts";

export const Treasury = Blueprint.thing({
  description: "A company's money on chain, controlled by its owners together.",
  fields: {
    id: Blueprint.id("tre"),
    threshold: Blueprint.uint(8), // how many owners it takes
    balance: Blueprint.money(usdc),
  },
  lives: treasury,
});

export const Seat = Blueprint.thing({
  description: "One owner's place on a treasury.",
  fields: {
    id: Blueprint.id("sea"),
    treasury: Treasury.fields.id,
    owner: Blueprint.account(),
  },
  lives: treasury,
});
