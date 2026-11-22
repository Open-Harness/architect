// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import start from "../things/payment/verbs/start.ts";

/** Ada has started a payment of 2000. The bank has said nothing yet. */
export default Blueprint.startingWorld("a-payment-is-pending", {
  cast: { ada: Blueprint.anyone },
  makes: (s) => [s.ada.run(start, { amount: 2000n })],
  gives: (s) => ({ payment: s.last.payment }),
});
