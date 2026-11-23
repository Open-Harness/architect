import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";
import { AccountExists } from "./errors.ts";

/** An outside account is one account of one superagent's source: its stable id, never its login. */
export const oneAccountPerExternalId = Blueprint.invariant.unique(
  [Account.fields.superagent, Account.fields.source, Account.fields.external],
  { refuse: AccountExists },
);
