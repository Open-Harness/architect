import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";

/**
 * The person who runs the company. Until Capxul has its own seats, the owner holds every right ERPNext splits among
 * its company-wide roles (System Manager, Accounts Manager, HR Manager and the rest), and other things admit it
 * through `owner.of("<thing>.company")` or, on a create, `owner.of("company")`.
 */
export const owner = Blueprint.role(Company, { rule: (company, caller) => company.owner === caller.person });
