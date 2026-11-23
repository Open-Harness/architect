// Generated from the blueprint. Do not edit.
import { EventNames } from "orthograph/server";
import * as BankAccount from "../../../blueprint/things/bank-account/events.ts";
import * as BridgeBusiness from "../../../blueprint/things/bridge-business/events.ts";
import * as BridgeIndividual from "../../../blueprint/things/bridge-individual/events.ts";
import * as Company from "../../../blueprint/things/company/events.ts";

EventNames.name(BankAccount.BankAccountClosed, "BankAccountClosed");
EventNames.name(BankAccount.BankAccountOpened, "BankAccountOpened");
EventNames.name(BridgeBusiness.KybApproved, "KybApproved");
EventNames.name(BridgeBusiness.KybRejected, "KybRejected");
EventNames.name(BridgeBusiness.KybStarted, "KybStarted");
EventNames.name(BridgeIndividual.KycApproved, "KycApproved");
EventNames.name(BridgeIndividual.KycRejected, "KycRejected");
EventNames.name(BridgeIndividual.KycStarted, "KycStarted");
EventNames.name(Company.CompanyCreated, "CompanyCreated");

export const names = ["BankAccountClosed", "BankAccountOpened", "KybApproved", "KybRejected", "KybStarted", "KycApproved", "KycRejected", "KycStarted", "CompanyCreated"] as const;
