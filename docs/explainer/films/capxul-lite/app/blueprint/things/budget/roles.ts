import { Blueprint } from "orthograph";
import { Budget } from "./thing.ts";
import { BudgetExceeded } from "./errors.ts";

// The holder is whoever the holder field names: the wallet that signs.
export const holder = Blueprint.role(Budget, { who: Budget.fields.holder });

// A rule inside one budget, said as data so TypeScript and Solidity both enforce it.
export const withinLimit = Blueprint.invariant.atMost( // new
  Budget.fields.spent, Budget.fields.limit, // new
  { refuse: BudgetExceeded }, // new
); // new
