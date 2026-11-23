import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Account, {
  description: "Record an account an event came from: a new one is seen, a known one keeps its state.",
  payload: { superagent: Account.fields.superagent, source: Account.fields.source, external: Account.fields.external, login: Account.fields.login, bot: Account.fields.bot },
  answer: { account: Account.fields.id },
  move: machine.moves.seen,
  allowed: [Blueprint.system],
});
