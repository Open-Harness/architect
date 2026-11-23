// Generated from the blueprint. Do not edit.
import { EventNames } from "orthograph/server";
import * as Company from "../../../blueprint/things/company/events.ts";

EventNames.name(Company.CompanyCreated, "CompanyCreated");

export const names = ["CompanyCreated"] as const;
