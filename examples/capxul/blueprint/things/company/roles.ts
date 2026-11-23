import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";

/**
 * The person who runs the company. Until Capxul has its own seats, the owner holds the rights ERPNext gives its
 * company-wide roles (System Manager, HR Manager, Accounts Manager), and other things admit it through
 * `owner.of("company")`.
 */
export const owner = Blueprint.role(Company, { rule: (company, caller) => company.owner === caller.person });
