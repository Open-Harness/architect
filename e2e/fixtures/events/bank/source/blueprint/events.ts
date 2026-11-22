import { Blueprint } from "orthograph";

/** The bank's word that a checkout finished: `reference` is the payment id the app gave it, `intent` the bank's own. */
export const checkoutCompleted = Blueprint.event({
  reference: Blueprint.value(Blueprint.text({ max: 64 })),
  intent: Blueprint.value(Blueprint.text({ max: 64 })),
});

/** A refund the app never takes in: a mount that leaves it out is sent it all the same, and answers 200 and keeps nothing. */
export const chargeRefunded = Blueprint.event({
  reference: Blueprint.value(Blueprint.text({ max: 64 })),
  amount: Blueprint.value(Blueprint.uint(32)),
});
