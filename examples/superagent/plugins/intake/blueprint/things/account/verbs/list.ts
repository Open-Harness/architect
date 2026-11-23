import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";
import { proposed, WHY_MAX } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Account, {
  description: "Let an account ask: its person's words may then start work.",
  payload: {
    account: Account.fields.id,
    why: Blueprint.optional(Blueprint.text({ max: WHY_MAX })),
  },
  answer: {},
  move: machine.moves.list,
  allowed: [Blueprint.signedIn],
  proposes: proposed({}),
});
