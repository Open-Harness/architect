import { Blueprint } from "orthograph";
import { CustomerGroup } from "./thing.ts";
import { CustomerGroupNameTaken } from "./errors.ts";

// ERPNext's `autoname: field:customer_group_name`, with the field `unique`: one company has one of each name.
export const oneNamePerCompany = Blueprint.invariant.unique([CustomerGroup.fields.company, CustomerGroup.fields.customerGroupName], {
  refuse: CustomerGroupNameTaken,
});
