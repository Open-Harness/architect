import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Account, {
  description: "Stop letting an account ask.",
  payload: {
    account: Account.fields.id,
  },
  answer: {},
  move: machine.moves.unlist,
  allowed: [Blueprint.signedIn],
});
