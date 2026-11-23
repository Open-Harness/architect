// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as companyCreate from "./company/create.ts";
import * as companyGet from "./company/get.ts";

export class Company extends HttpApiGroup.make("company").add(companyCreate.endpoint).add(companyGet.endpoint) {}
export class Api extends HttpApi.make("capxul").add(Company) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "company.create": companyCreate, "company.get": companyGet } as const;
