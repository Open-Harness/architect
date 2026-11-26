import { Blueprint } from "orthograph";
import { SupplierGroup } from "./thing.ts";

export const SupplierGroupCreated = Blueprint.event({ supplierGroup: SupplierGroup.fields.id, company: SupplierGroup.fields.company });
