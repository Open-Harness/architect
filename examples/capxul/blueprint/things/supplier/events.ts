import { Blueprint } from "orthograph";
import { Supplier } from "./thing.ts";

export const SupplierCreated = Blueprint.event({ supplier: Supplier.fields.id, company: Supplier.fields.company });
export const SupplierDisabled = Blueprint.event({ supplier: Supplier.fields.id });
export const SupplierEnabled = Blueprint.event({ supplier: Supplier.fields.id });
