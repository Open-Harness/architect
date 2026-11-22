import { Blueprint } from "orthograph";
import { Budget } from "./thing.ts";
import { Instant } from "../../values/time.ts";

export const BudgetOpened = Blueprint.event({ budget: Budget.fields.id, openedAt: Instant });
export const BudgetReset = Blueprint.event({ budget: Budget.fields.id, at: Instant });
export const BudgetReported = Blueprint.event({ budget: Budget.fields.id, at: Instant });
