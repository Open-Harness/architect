import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";
import { treasury } from "../roles.ts";

export default Blueprint.operation(Allowance, {
  description: "Stop an allowance. Nothing more can be spent from it.",
  payload: { allowance: Allowance.fields.id },
  answer: {},
  move: machine.moves.revoke,
  allowed: [treasury],
  budget: { p95: "5 seconds" },
});
