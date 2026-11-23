import { Blueprint } from "orthograph";
import { Eval } from "../thing.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Eval, {
  description: "Read one page of a thread, through its connection.",
  payload: {
    superagent: Eval.fields.superagent,
    eval: Eval.fields.id,
    cursor: Blueprint.optional(Blueprint.text({ max: 200 })),
  },
  answer: {
    text: Blueprint.text({ max: 65536 }),
  },
  allowed: [itsMain.of("superagent")],
});
