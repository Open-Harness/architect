import { Blueprint } from "orthograph";
import { Echo } from "../thing.js";
import { EchoOther, EchoProblem } from "../errors.js";

export default Blueprint.operation(Echo, {
  description: "Say the text back, the way the mount chose to say it.",
  payload: { text: Blueprint.text({ max: 64 }) },
  answer: { text: Blueprint.text({ max: 128 }) },
  errors: [EchoOther, EchoProblem],
  allowed: [Blueprint.anyone],
});
