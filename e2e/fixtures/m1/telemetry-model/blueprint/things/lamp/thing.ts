import { Blueprint } from "orthograph";

export const Lamp = Blueprint.thing({
  description: "A lamp that is lit once something slow has answered.",
  fields: { id: Blueprint.id("lmp"), label: Blueprint.text({ max: 40 }) },
});
