// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as bankAccountClose } from "../../api/src/bank-account/close.ts";
import { declaration as bankAccountGet } from "../../api/src/bank-account/get.ts";
import { declaration as bankAccountOpen } from "../../api/src/bank-account/open.ts";
import { declaration as bridgeBusinessApprove } from "../../api/src/bridge-business/approve.ts";
import { declaration as bridgeBusinessGet } from "../../api/src/bridge-business/get.ts";
import { declaration as bridgeBusinessReject } from "../../api/src/bridge-business/reject.ts";
import { declaration as bridgeBusinessStart } from "../../api/src/bridge-business/start.ts";
import { declaration as bridgeIndividualApprove } from "../../api/src/bridge-individual/approve.ts";
import { declaration as bridgeIndividualGet } from "../../api/src/bridge-individual/get.ts";
import { declaration as bridgeIndividualReject } from "../../api/src/bridge-individual/reject.ts";
import { declaration as bridgeIndividualStart } from "../../api/src/bridge-individual/start.ts";
import { declaration as companyCreate } from "../../api/src/company/create.ts";
import { declaration as companyGet } from "../../api/src/company/get.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "bank-account.close": { description: "Close a company's bank account; it takes no more deposits.", operation: bankAccountClose, states: ["open","closed"], move: {"key":"close","from":["open"],"to":["closed"],"emits":"BankAccountClosed"} },
  "bank-account.get": { description: "Read one bank-account by its id: company, business, accountName, currency, bankName, accountNumber, routingNumber, state.", operation: bankAccountGet, states: ["open","closed"] },
  "bank-account.open": { description: "Open a bank account for a company whose KYB Bridge approved: answers where to send deposits. Refuses BankAccountNameTaken when another open bank account holds this company and account name.", operation: bankAccountOpen, states: ["open","closed"], move: {"key":"open","from":[],"to":["open"],"emits":"BankAccountOpened"} },
  "bridge-business.approve": { description: "Record that Bridge approved a company's KYB. Refuses KybAlreadyStarted when another bridge business holds this company.", operation: bridgeBusinessApprove, states: ["started","approved","rejected"], move: {"key":"approve","from":["started"],"to":["approved"],"emits":"KybApproved"} },
  "bridge-business.get": { description: "Read one bridge-business by its id: company, legalName, email, kybLink, tosLink, state.", operation: bridgeBusinessGet, states: ["started","approved","rejected"] },
  "bridge-business.reject": { description: "Record that Bridge turned down a company's KYB, and why. Refuses KybAlreadyStarted when another bridge business holds this company.", operation: bridgeBusinessReject, states: ["started","approved","rejected"], move: {"key":"reject","from":["started"],"to":["rejected"],"emits":"KybRejected"} },
  "bridge-business.start": { description: "Start a company's KYB with Bridge: answers the form the business fills in, and Bridge's terms. Refuses KybAlreadyStarted when another bridge business holds this company.", operation: bridgeBusinessStart, states: ["started","approved","rejected"], move: {"key":"start","from":[],"to":["started"],"emits":"KybStarted"} },
  "bridge-individual.approve": { description: "Record that Bridge approved a person's KYC. Refuses KycAlreadyStarted when another bridge individual holds this person.", operation: bridgeIndividualApprove, states: ["started","approved","rejected"], move: {"key":"approve","from":["started"],"to":["approved"],"emits":"KycApproved"} },
  "bridge-individual.get": { description: "Read one bridge-individual by its id: person, fullName, email, kycLink, tosLink, state.", operation: bridgeIndividualGet, states: ["started","approved","rejected"] },
  "bridge-individual.reject": { description: "Record that Bridge turned down a person's KYC, and why. Refuses KycAlreadyStarted when another bridge individual holds this person.", operation: bridgeIndividualReject, states: ["started","approved","rejected"], move: {"key":"reject","from":["started"],"to":["rejected"],"emits":"KycRejected"} },
  "bridge-individual.start": { description: "Start your own KYC with Bridge: answers the form you fill in, and Bridge's terms. Refuses KycAlreadyStarted when another bridge individual holds this person.", operation: bridgeIndividualStart, states: ["started","approved","rejected"], move: {"key":"start","from":[],"to":["started"],"emits":"KycStarted"} },
  "company.create": { description: "Set up a company; the person who sets it up runs it. Refuses CompanyAbbrTaken when another company holds this owner and abbr. Refuses CompanyNameTaken when another company holds this owner and company name.", operation: companyCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"CompanyCreated"} },
  "company.get": { description: "Read one company by its id: companyName, abbr, country, defaultCurrency, owner, state.", operation: companyGet, states: ["active"] },
} as const satisfies { readonly [name: string]: McpEntry };
