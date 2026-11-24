import { Blueprint } from "orthograph";
import { Branch } from "./thing.ts";

export const BranchCreated = Blueprint.event({ branch: Branch.fields.id, company: Branch.fields.company });
