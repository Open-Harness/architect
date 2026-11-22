import { Blueprint } from "orthograph";
import { Purse } from "./thing.ts";
import { Count } from "../../values/counts.ts";

export const PurseOpened = Blueprint.event({ purse: Purse.fields.id, limit: Count });
export const PurseSpent = Blueprint.event({ purse: Purse.fields.id, left: Count });
export const PurseRefilled = Blueprint.event({ purse: Purse.fields.id, period: Count });
