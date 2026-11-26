import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const Bell = Blueprint.thing({
  description: "A bell set to chime once, an hour after it was set: chiming keeps it ringing, and leaves `setAt` as it was.",
  code: "BL",
  fields: { id: Blueprint.id("bel"), name: Title, setAt: Instant, chimes: Count },
});
