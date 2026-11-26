import { Blueprint } from "orthograph";
import { SupplierGroup } from "./thing.ts";
import { SupplierGroupNameTaken } from "./errors.ts";

// ERPNext's `autoname: field:supplier_group_name`, with the field `unique`: one company has one of each name.
export const oneNamePerCompany = Blueprint.invariant.unique([SupplierGroup.fields.company, SupplierGroup.fields.supplierGroupName], {
  refuse: SupplierGroupNameTaken,
});
