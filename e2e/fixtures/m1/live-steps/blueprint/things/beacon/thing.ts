import { Blueprint } from "orthograph";

export const Beacon = Blueprint.thing({
  description: "A light that is lit once something slow has answered.",
  fields: { id: Blueprint.id("bcn"), label: Blueprint.text({ max: 40 }) },
});
