import { Blueprint } from "orthograph";
import { CustomerGroup } from "./thing.ts";

export const CustomerGroupCreated = Blueprint.event({ customerGroup: CustomerGroup.fields.id, company: CustomerGroup.fields.company });
