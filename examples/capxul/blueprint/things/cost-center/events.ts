import { Blueprint } from "orthograph";
import { CostCenter } from "./thing.ts";

export const CostCenterCreated = Blueprint.event({ costCenter: CostCenter.fields.id, company: CostCenter.fields.company });
