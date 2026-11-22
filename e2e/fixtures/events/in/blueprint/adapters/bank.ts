// The fixture bank, mounted as `bank` (its file's name). The app takes the checkout's word in and leaves the refund's out.
// `b.events` is the mount's view of the adapter's events, as `b.calls` is of its calls (M5-checks, call 2).
import { Blueprint } from "orthograph";
import bank from "@fixture/bank";

export default Blueprint.use(bank, (b) => [b.include(b.events.checkoutCompleted)]);
