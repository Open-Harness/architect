// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as apiKeyCreate } from "../../api/src/api-key/create.ts";
import { declaration as invitationAccept } from "../../api/src/invitation/accept.ts";
import { declaration as invitationRevoke } from "../../api/src/invitation/revoke.ts";
import { declaration as invitationSend } from "../../api/src/invitation/send.ts";
import { declaration as membershipGet } from "../../api/src/membership/get.ts";
import { declaration as organizationCreate } from "../../api/src/organization/create.ts";
import { declaration as organizationGet } from "../../api/src/organization/get.ts";
import { declaration as personSignUp } from "../../api/src/person/sign-up.ts";
import { declaration as sessionShow } from "../../api/src/session/show.ts";
import { declaration as sessionSignIn } from "../../api/src/session/sign-in.ts";
import { declaration as systemHealth } from "../../api/src/system/health.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "api-key.create": { description: "Create an API key in an organisation. The key itself is shown once.", operation: apiKeyCreate },
  "invitation.accept": { description: "Accept an invitation and become a member of its organisation.", operation: invitationAccept, states: ["pending","accepted","revoked"], move: {"key":"accept","from":["pending"],"to":["accepted"],"emits":"InvitationAccepted"} },
  "invitation.revoke": { description: "Withdraw an invitation that hasn't been accepted.", operation: invitationRevoke, states: ["pending","accepted","revoked"], move: {"key":"revoke","from":["pending"],"to":["revoked"],"emits":"InvitationRevoked"} },
  "invitation.send": { description: "Invite someone to an organisation by email.", operation: invitationSend, states: ["pending","accepted","revoked"], move: {"key":"send","from":[],"to":["pending"],"emits":"InvitationSent"} },
  "membership.get": { description: "Read one membership by its id: organization, person, role.", operation: membershipGet },
  "organization.create": { description: "Found an organisation. Whoever founds it owns it, and is its first member.", operation: organizationCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"OrganizationCreated"} },
  "organization.get": { description: "Read one organization by its id: name, owner, state.", operation: organizationGet, states: ["active"] },
  "person.sign-up": { description: "Sign up with an email address and a password.", operation: personSignUp },
  "session.show": { description: "Who is signed in.", operation: sessionShow },
  "session.sign-in": { description: "Sign in with email and password. The token is the bearer for every later call.", operation: sessionSignIn },
  "system.health": { description: "Is the application up?", operation: systemHealth },
} as const satisfies { readonly [name: string]: McpEntry };
