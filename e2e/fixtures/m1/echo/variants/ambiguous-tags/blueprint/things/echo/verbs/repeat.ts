import { Blueprint } from "orthograph";
import { Echo } from "../thing.js";
import { EchoProblem } from "../errors.js";
import { EchoProblem as AuditEchoProblem } from "../../audit/errors.js";

// Planted: two error classes with one tag in one operation's union.
export default Blueprint.operation(Echo, {
  description: "Say the text back, the way the mount chose to say it.",
  payload: { text: Blueprint.text({ max: 64 }) },
  answer: { text: Blueprint.text({ max: 128 }) },
  errors: [EchoProblem, AuditEchoProblem],
  allowed: [Blueprint.anyone],
});
