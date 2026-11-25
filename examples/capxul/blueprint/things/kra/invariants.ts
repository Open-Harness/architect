import { Blueprint } from "orthograph";
import { Kra } from "./thing.ts";
import { KraTitleTaken } from "./errors.ts";

// HRMS names a KRA by its title; here within its company.
export const oneTitlePerCompany = Blueprint.invariant.unique([Kra.fields.company, Kra.fields.title], { refuse: KraTitleTaken });
