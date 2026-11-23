import { Blueprint } from "orthograph";
import ledger from "../../stores/ledger.js";

export const Line = Blueprint.thing({
  description: "One line of the ledger: an amount.",
  fields: { id: Blueprint.id("lin"), amount: Blueprint.uint(64) },
  lives: ledger,
  code: "LI",
});
