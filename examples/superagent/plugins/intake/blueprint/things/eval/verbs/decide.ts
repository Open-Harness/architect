import { Blueprint, Schema } from "orthograph";
import { Eval } from "../thing.ts";
import { machine } from "../machine.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Eval, {
  description: "Record one judgement per enabled rule.",
  payload: {
    superagent: Eval.fields.superagent,
    eval: Eval.fields.id,
    judgements: Blueprint.value(Schema.Unknown),
  },
  answer: {},
  move: machine.moves.decided,
  allowed: [itsMain.of("superagent")],
});
