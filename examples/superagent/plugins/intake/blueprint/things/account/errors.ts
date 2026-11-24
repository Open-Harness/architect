import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";

export class AccountExists extends Blueprint.error({ superagent: Account.fields.superagent, source: Account.fields.source, external: Account.fields.external }, { exit: 82 }) {}
