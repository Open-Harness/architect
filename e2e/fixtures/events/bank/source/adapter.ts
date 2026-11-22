// A fixture bank: a hand-written stand-in sender, never a real vendor (M5-checks, call 1). It tells an app a checkout
// completed or a charge was refunded, by a signed POST to the app's door at /_in/<mount>.
//
// The wire, which the checks' own senders repeat (e2e/events/world.ts):
//   body       JSON `{ "id": "<event id>", "type": "<event name>", ...the event's fields }`
//   header     `bank-signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" under the signing secret>`
//   tolerance  a `t` more than five minutes from the door's clock is refused, as a bad signature
// The door's secret is `signing` (blueprint/secrets.ts), named `BANK_SIGNING` for a mount called `bank`; in a world it
// is the declared test value.
import { Blueprint } from "orthograph";
import * as events from "./blueprint/events.js";
import { signing } from "./blueprint/secrets.js";

export default Blueprint.adapter({
  description: "A fixture bank that tells us a checkout completed, signed with a shared secret. No real vendor.",
  choices: {},
  events,
  door: Blueprint.door({
    secret: signing,
    verify: Blueprint.door.hmac({ header: "bank-signature", scheme: "timestamped", tolerance: "5 minutes" }),
    id: "id",
    type: "type",
  }),
});
