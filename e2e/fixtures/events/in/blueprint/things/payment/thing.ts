import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";

export const Payment = Blueprint.thing({
  description: "Money someone paid, as the bank tells us. It is pending until the bank says the checkout completed.",
  fields: { id: Blueprint.id("pay"), amount: Count, intent: Title },
});
