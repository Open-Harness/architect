// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as bankAccountClose from "./bank-account/close.ts";
import * as bankAccountGet from "./bank-account/get.ts";
import * as bankAccountOpen from "./bank-account/open.ts";
import * as bridgeBusinessApprove from "./bridge-business/approve.ts";
import * as bridgeBusinessGet from "./bridge-business/get.ts";
import * as bridgeBusinessReject from "./bridge-business/reject.ts";
import * as bridgeBusinessStart from "./bridge-business/start.ts";
import * as bridgeIndividualApprove from "./bridge-individual/approve.ts";
import * as bridgeIndividualGet from "./bridge-individual/get.ts";
import * as bridgeIndividualReject from "./bridge-individual/reject.ts";
import * as bridgeIndividualStart from "./bridge-individual/start.ts";
import * as companyCreate from "./company/create.ts";
import * as companyGet from "./company/get.ts";

export class BankAccount extends HttpApiGroup.make("bank-account").add(bankAccountClose.endpoint).add(bankAccountGet.endpoint).add(bankAccountOpen.endpoint) {}
export class BridgeBusiness extends HttpApiGroup.make("bridge-business").add(bridgeBusinessApprove.endpoint).add(bridgeBusinessGet.endpoint).add(bridgeBusinessReject.endpoint).add(bridgeBusinessStart.endpoint) {}
export class BridgeIndividual extends HttpApiGroup.make("bridge-individual").add(bridgeIndividualApprove.endpoint).add(bridgeIndividualGet.endpoint).add(bridgeIndividualReject.endpoint).add(bridgeIndividualStart.endpoint) {}
export class Company extends HttpApiGroup.make("company").add(companyCreate.endpoint).add(companyGet.endpoint) {}
export class Api extends HttpApi.make("capxul").add(BankAccount).add(BridgeBusiness).add(BridgeIndividual).add(Company) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "bank-account.close": bankAccountClose, "bank-account.get": bankAccountGet, "bank-account.open": bankAccountOpen, "bridge-business.approve": bridgeBusinessApprove, "bridge-business.get": bridgeBusinessGet, "bridge-business.reject": bridgeBusinessReject, "bridge-business.start": bridgeBusinessStart, "bridge-individual.approve": bridgeIndividualApprove, "bridge-individual.get": bridgeIndividualGet, "bridge-individual.reject": bridgeIndividualReject, "bridge-individual.start": bridgeIndividualStart, "company.create": companyCreate, "company.get": companyGet } as const;
