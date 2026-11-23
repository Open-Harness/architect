import { Blueprint } from "orthograph";
import { Allowance } from "../thing.ts";
import { machine } from "../machine.ts";
import { treasury } from "../roles.ts";

// A chain operation declares no steps, idempotent, runs or signedBy (M6-chain item 8).
export default Blueprint.operation(Allowance, {
  description: "Let a member spend a token from the Safe, up to a limit.",
  payload: { safe: Allowance.fields.safe, member: Allowance.fields.member, token: Allowance.fields.token, limit: Allowance.fields.limit },
  answer: { allowance: Allowance.fields.id }, // the new row's id, minted by the client (M6-chain items 6 and 7)
  move: machine.moves.grant,
  allowed: [treasury], // decided on the payload's safe (item 5)
  budget: { p95: "5 seconds" }, // judged on the time to included
});
