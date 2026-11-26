import { Blueprint } from "orthograph";
import { Title } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Desk = Blueprint.thing({
  description: "A hot desk: held by someone, and expired by the keeper an hour after it was held unless it was released first.",
  fields: { id: Blueprint.id("dsk"), name: Title, heldAt: Instant },
});
