// Generated from blueprint/projections/api.ts. Do not edit.
import { EventNames } from "orthograph/server";
import * as Allowance from "../../../blueprint/things/allowance/events.ts";
import * as Invitation from "../../../blueprint/things/invitation/events.ts";
import * as Organization from "../../../blueprint/things/organization/events.ts";

EventNames.name(Allowance.AllowanceGranted, "AllowanceGranted");
EventNames.name(Allowance.AllowanceRevoked, "AllowanceRevoked");
EventNames.name(Allowance.AllowanceSpent, "AllowanceSpent");
EventNames.name(Invitation.InvitationAccepted, "InvitationAccepted");
EventNames.name(Invitation.InvitationRevoked, "InvitationRevoked");
EventNames.name(Invitation.InvitationSent, "InvitationSent");
EventNames.name(Organization.OrganizationCreated, "OrganizationCreated");

export const names = ["AllowanceGranted", "AllowanceRevoked", "AllowanceSpent", "InvitationAccepted", "InvitationRevoked", "InvitationSent", "OrganizationCreated"] as const;
