import { Blueprint } from "orthograph";
import { Customer } from "./thing.ts";

export const CustomerCreated = Blueprint.event({ customer: Customer.fields.id, company: Customer.fields.company });
export const CustomerDisabled = Blueprint.event({ customer: Customer.fields.id });
export const CustomerEnabled = Blueprint.event({ customer: Customer.fields.id });
