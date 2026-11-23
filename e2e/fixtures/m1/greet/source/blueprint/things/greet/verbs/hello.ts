import { Blueprint } from "orthograph";
import { Greet } from "../thing.js";

export default Blueprint.operation(Greet, {
  description: "Greet someone by name.",
  payload: { name: Blueprint.text({ max: 64 }) },
  answer: { text: Blueprint.text({ max: 128 }) },
  allowed: [Blueprint.anyone],
});
