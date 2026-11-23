import { Blueprint } from "orthograph";

export const Badge = Blueprint.thing({
  description: "A badge awarded to an organisation.",
  fields: { id: Blueprint.id("bdg"), title: Blueprint.text({ max: 40 }) },
});
