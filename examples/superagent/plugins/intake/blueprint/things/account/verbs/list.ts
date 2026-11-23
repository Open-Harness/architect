import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Account, {
  description: "Let an account ask: its person's words may then start work.",
  payload: { account: Account.fields.id },
  answer: {  },
  move: machine.moves.list,
  allowed: [Blueprint.signedIn],
});
