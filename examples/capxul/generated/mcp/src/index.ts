// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as companyCreate } from "../../api/src/company/create.ts";
import { declaration as companyGet } from "../../api/src/company/get.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "company.create": { description: "Set up a company; the person who sets it up runs it. Refuses CompanyAbbrTaken when another company holds this owner and abbr. Refuses CompanyNameTaken when another company holds this owner and company name.", operation: companyCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"CompanyCreated"} },
  "company.get": { description: "Read one company by its id: companyName, abbr, country, defaultCurrency, owner, state.", operation: companyGet, states: ["active"] },
} as const satisfies { readonly [name: string]: McpEntry };
