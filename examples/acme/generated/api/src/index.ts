// Generated from blueprint/projections/api.ts. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as allowanceGet from "./allowance/get.ts";
import * as allowanceGrant from "./allowance/grant.ts";
import * as allowanceRevoke from "./allowance/revoke.ts";
import * as allowanceSpend from "./allowance/spend.ts";
import * as apiKeyCreate from "./api-key/create.ts";
import * as invitationAccept from "./invitation/accept.ts";
import * as invitationRevoke from "./invitation/revoke.ts";
import * as invitationSend from "./invitation/send.ts";
import * as membershipGet from "./membership/get.ts";
import * as organizationCreate from "./organization/create.ts";
import * as organizationGet from "./organization/get.ts";
import * as personSignUp from "./person/sign-up.ts";
import * as sessionShow from "./session/show.ts";
import * as sessionSignIn from "./session/sign-in.ts";
import * as systemHealth from "./system/health.ts";

export class Allowance extends HttpApiGroup.make("allowance").add(allowanceGet.endpoint).add(allowanceGrant.endpoint).add(allowanceRevoke.endpoint).add(allowanceSpend.endpoint) {}
export class ApiKey extends HttpApiGroup.make("api-key").add(apiKeyCreate.endpoint) {}
export class Invitation extends HttpApiGroup.make("invitation").add(invitationAccept.endpoint).add(invitationRevoke.endpoint).add(invitationSend.endpoint) {}
export class Membership extends HttpApiGroup.make("membership").add(membershipGet.endpoint) {}
export class Organization extends HttpApiGroup.make("organization").add(organizationCreate.endpoint).add(organizationGet.endpoint) {}
export class Person extends HttpApiGroup.make("person").add(personSignUp.endpoint) {}
export class Session extends HttpApiGroup.make("session").add(sessionShow.endpoint).add(sessionSignIn.endpoint) {}
export class System extends HttpApiGroup.make("system").add(systemHealth.endpoint) {}
export class Api extends HttpApi.make("acme").add(Allowance).add(ApiKey).add(Invitation).add(Membership).add(Organization).add(Person).add(Session).add(System) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "allowance.get": allowanceGet, "allowance.grant": allowanceGrant, "allowance.revoke": allowanceRevoke, "allowance.spend": allowanceSpend, "api-key.create": apiKeyCreate, "invitation.accept": invitationAccept, "invitation.revoke": invitationRevoke, "invitation.send": invitationSend, "membership.get": membershipGet, "organization.create": organizationCreate, "organization.get": organizationGet, "person.sign-up": personSignUp, "session.show": sessionShow, "session.sign-in": sessionSignIn, "system.health": systemHealth } as const;
