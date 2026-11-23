import { Blueprint } from "orthograph";
import { Eval } from "../thing.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Eval, {
  description: "Read what a judgement needs: the thread's history and what else it touches.",
  payload: { superagent: Eval.fields.superagent, eval: Eval.fields.id },
  answer: { text: Blueprint.text({ max: 65536 }) },
  allowed: [itsMain.of("superagent")],
});
