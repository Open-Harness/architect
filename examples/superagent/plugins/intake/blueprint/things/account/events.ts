import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";

export const AccountSeen = Blueprint.event({ account: Account.fields.id, superagent: Account.fields.superagent });
export const AccountListed = Blueprint.event({ account: Account.fields.id });
export const AccountUnlisted = Blueprint.event({ account: Account.fields.id });
