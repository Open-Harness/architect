import { Blueprint } from "orthograph";
import { Spend } from "./thing.ts";

export const SpendRecorded = Blueprint.event({ spend: Spend.fields.id, budget: Spend.fields.budget });
export const SpendExplained = Blueprint.event({ spend: Spend.fields.id });
