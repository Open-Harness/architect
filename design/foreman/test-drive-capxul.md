# Test drive: Foreman on Capxul's first slice

Written 20 November 2026. Foreman isn't built, so this plays it by hand: the intake, explore and shape routines in
`design/decisions/F9-foreman.md` (section 8; together they are the model draft's ideation loop), followed as written,
on the idea the whole project started from. The input is Capxul Next (`/Users/abuusama/projects/capxul-next`, read
only, at commit `50851875`). The slice is Capxul's first: a company, its members, invitations, and signing in with a
wallet. It stops where the ideation loop stops: a blueprint and the questions, with no handlers.

It has three parts: the blueprint slice Foreman would propose, the questions it would put to Aaron, and every place
Orthograph or the skills fell short.

How to read the cites: Capxul's files are given from its repository root; Orthograph's are on `main` unless they say
`goal/stage-1`, which is at `33128c15`.

## 1. The wake

Foreman starts by reading where things stand. Capxul has no brief or board yet, so this is a first wake. Intake's
questions about the person come first, and Aaron's answers are already on record (he listens, and reads code for now).
Capxul's `docs/grounding.md` is most of a brief already (F9, section 5). So the wake routine would say, for the ear:

> We're starting Capxul on Orthograph. Capxul already has its own blueprint, written by hand in its own format, and a
> working pipeline around it; none of it runs on Orthograph yet. I've read it. The first slice is a company, its people,
> invitations, and signing in with a wallet. I have a blueprint draft that compiles in my head but not yet on disk, and
> eight questions for you, four of which block it.

Then it runs the ideation loop.

## 2. The ideation loop, step by step

**Step 1: the idea in one sentence.** From Capxul's grounding: "Capxul is an on-chain company: one complete business
system with Capxul's money and authority built in" (`docs/grounding.md:13`). The first slice, in one sentence: *a person
founds a company, invites people into it by email, and everyone signs in with a wallet.*

**Step 2: read what exists.** Capxul's blueprint is 134 files in `packages/blueprint/src/`: 20 things and 48 verb
files, in its own format, read by its own toolkit (`packages/blueprint-tools`) and generator (`packages/generate`). The
parts this slice touches:

| Capxul declaration | What it says | Where |
|---|---|---|
| founding a company | one step: handle, profile, founding Directors, a signing threshold, founding members, opening capital; answers `Founded` with a Safe and the approvals the Directors must sign, or `Resumed` for the same founding again | `packages/blueprint/src/things/company/verbs/create.ts:24-61` |
| the company's refusals | `PersonNotFound`, `FounderNotReady`, `HandleTaken`, `FoundingChanged`, `SetupUnfinished`, `NotADirector`, `NotAMember`, `MemberHasNoSafe`, at exits 2 and 4 | `packages/blueprint/src/things/company/refusals.ts:6-77` |
| how a person belongs | a Director (a signer of the company's Safe) or a member (a seat) | `packages/blueprint/src/things/member/values.ts:5-6` |
| the invitation | offers only a member's seat; pending, then accepted or declined; accepting one already accepted changes nothing | `packages/blueprint/src/things/invitation/values.ts:17`, `lifecycle.ts:23-49` |
| who may invite | for now only the founder | `docs/decisions.md:41`; `packages/blueprint/src/things/invitation/verbs/send.ts` (`allowed: [roles.founder]`) |
| who a call acts as | the world's owner, or a person of the world; real sign-in waits for Capxul's phase 8 | `packages/blueprint/src/protocol/sign-in.ts:1-15` |
| a person's identity | one sign-in and one signer everywhere; a personal Safe whose address comes from the email | `docs/decisions.md:52` |

What Foreman keeps: the things, the states, who may do what, and the refusals, renamed to Orthograph's spelling. What it
drops for this slice, and says so: the company's Safe, the Directors' signatures and the opening capital (they need the
chain), and the company's business site (it needs the Frappe bench). Questions 2 and 7 below put both cuts to Aaron.

**Step 3: declare.** Section 3 below is the result.

**Step 4: batch the questions.** Section 4.

**Step 5: journeys as stories.** The journey author would write these, for Aaron to read back. Because his "Working with you" says
he listens, Foreman reads them aloud, and draws the invitation's machine with the `machine-journey` skill when he asks to
see it:

1. Dana founds Northwind; she is its founder and first Director, and the handle `northwind` is taken from then on.
2. Eli tries to found a second company called `northwind`, and is refused because the handle is taken.
3. Dana invites Olga by email; Olga signs in, sees the invitation, accepts it and is a member.
4. Olga declines instead; the invitation is closed, and accepting it afterwards is refused.
5. Sam, a member, tries to invite someone, and is refused: only the founder invites.
6. Dana invites Olga twice while the first is pending, and the second is refused.
7. Dana revokes a pending invitation, and Olga can no longer accept it.
8. Olga signs in with her wallet, and her session shows the wallet's address.

**Step 6: walk each journey with a throwaway handler** (lesson 2 in `design/process/lessons.md`). On paper, against what
Orthograph has today:

| Story | Can it be walked? | Why |
|---|---|---|
| 1, 2 | yes | a unique handle (`unique:` on the thing, goal/stage-1) and a database step that also writes the founder's membership (`Blueprint.step.database({ writes: [...] })`, `packages/orthograph/src/modules/operations/types.ts:171` on goal/stage-1) |
| 3 | yes | the starter already walks send and accept (`examples/starter/blueprint/starting-worlds/invited.ts`) |
| 4 | yes | the starter has no decline, but it is one more move on the machine, the same shape as `revoke` (`examples/starter/blueprint/things/invitation/verbs/revoke.ts`) |
| 5 | yes | the founder is a rule over one company (`examples/starter/blueprint/things/organization/roles.ts:5`) |
| 6 | **no** | "one pending invitation per company and email" is uniqueness over two fields; Orthograph's unique keys are one field each (finding 4) |
| 7 | yes | the starter's `revoke` (`examples/starter/blueprint/things/invitation/verbs/revoke.ts`) |
| 8 | **no** | there is no wallet sign-in (finding 1) |

So two of eight are blocked by the framework. Foreman would mark the slice "not ready", file both as framework snags,
and carry on with the six it can walk.

## 3. The slice Foreman would propose

Spelled as on `goal/stage-1` (the unique fields, the list read and `code:` are there, not on `main`). No handlers: those
are the climber's. Each blank is a `Blueprint.todo` that `ortho check` names until it is filled. **None of this was
compiled:** it was written against the API as read on `goal/stage-1`, and the first thing the climber does is run
`ortho check` on it. Capxul's word is
"company", so the app says company; question 3 asks how that meets Orthograph's planned organisations plugin.

```ts
// capxul/blueprint/values/company.ts
import { Blueprint, Schema } from "orthograph";

/** A company's handle: the one name it is found by, such as `northwind`. Lower case, a letter first. */
export const CompanyHandle = Blueprint.value(Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9-]{1,39}$/)));
/** A company's name as people see it. */
export const CompanyName = Blueprint.value(Blueprint.text({ max: 140 }));
/** Where a company is registered: a two-letter country code. No country is assumed. */
export const Country = Blueprint.value(Schema.String.check(Schema.isPattern(/^[A-Z]{2}$/)));
/** How a person belongs to a company: a Director signs for it; a member has a seat. */
export const Seat = Blueprint.value(Schema.Literals(["director", "member"]));
/** The other people named as Directors when a company is founded. Possibly none. */
export const FoundingDirectors = Blueprint.value(Schema.Array(Blueprint.id("per").schema));
```

```ts
// capxul/blueprint/things/company/thing.ts
import { Blueprint } from "orthograph";
import { CompanyHandle, CompanyName, Country } from "../../values/company.ts";

export const Company = Blueprint.thing({
  description: "A business on Capxul: its handle, its profile, and the person who founded it.",
  code: "CO",
  // The person is Better Auth's until the auth plugin is mounted, as Plugged In's handle owner is.
  fields: {
    id: Blueprint.id("co"),
    handle: CompanyHandle,
    name: CompanyName,
    country: Country,
    founder: Blueprint.id("per"),
    threshold: Blueprint.todo("how many Directors must sign a proposal; waits on question 2"),
  },
  unique: { handle: {} }, // in every state: a handle is never reused
});
```

```ts
// capxul/blueprint/things/company/machine.ts
import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Company, {
  // Capxul's founding waits for the Directors' signatures before the company is ready; with no chain in this slice
  // there is nothing to wait for, so the setup state waits on question 2.
  states: ["active"],
  moves: { found: { from: [], to: "active", emits: Events.CompanyFounded } },
  notFrom: { exit: 20 },
});
```

```ts
// capxul/blueprint/things/company/events.ts
import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";

export const CompanyFounded = Blueprint.event({ company: Company.fields.id, founder: Company.fields.founder });
```

```ts
// capxul/blueprint/things/company/errors.ts
import { Blueprint } from "orthograph";
import { CompanyHandle } from "../../values/company.ts";

// Capxul's HandleTaken was exit 2, inside Orthograph's runtime range (finding 7); declared refusals start at 5.
export class CompanyHandleTaken extends Blueprint.error({ handle: CompanyHandle }, { exit: 10 }) {}
```

```ts
// capxul/blueprint/things/company/roles.ts
import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";

// The person who founded the company. For now the only one who manages its people (Capxul, 15 November 2026).
export const founder = Blueprint.role(Company, { rule: (company, caller) => company.founder === caller.person });

// A Director of this company. Directors are Membership rows, and a role is a rule over one thing, so this can't be
// written today (finding 3).
export const director = Blueprint.todo<typeof founder>("a Director of this company: a membership with seat director");
```

```ts
// capxul/blueprint/things/company/verbs/found.ts
import { Blueprint } from "orthograph";
import { Company } from "../thing.ts";
import { machine } from "../machine.ts";
import { CompanyHandleTaken } from "../errors.ts";
import { Membership } from "../../membership/thing.ts";
import { FoundingDirectors } from "../../../values/company.ts";

export default Blueprint.operation(Company, {
  description: "Found a company. The founder is its first Director.",
  payload: {
    handle: Company.fields.handle,
    name: Company.fields.name,
    country: Company.fields.country,
    // Founded in one step with its Directors named (question 6). A raw schema of person ids, so the model reads it as
    // a schema, not as people (finding 11).
    directors: FoundingDirectors,
  },
  answer: { company: Company.fields.id },
  move: machine.moves.found,
  errors: [CompanyHandleTaken],
  allowed: [Blueprint.signedIn],
  steps: { found: Blueprint.step.database({ writes: [Company, Membership] }) }, // the company and its Directors' seats (the founder's first), together
  idempotent: "request",
  budget: { p95: "250 millis" },
});
```

```ts
// capxul/blueprint/things/company/verbs/get.ts
import { Blueprint } from "orthograph";
import { Company } from "../thing.ts";

export default Blueprint.read(Company, {
  by: "id",
  fields: ["handle", "name", "country", "founder", "state"],
  allowed: [Blueprint.signedIn],
  budget: { p95: "50 millis" },
});
```

```ts
// capxul/blueprint/things/membership/thing.ts
import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Seat } from "../../values/company.ts";

export const Membership = Blueprint.thing({
  description: "A person's seat in a company: a Director, or a member.",
  code: "MB",
  fields: { id: Blueprint.id("mem"), company: Company.fields.id, person: Blueprint.id("per"), seat: Seat },
  // One seat per person per company is uniqueness over two fields, which isn't expressible yet (finding 4).
});
```

```ts
// capxul/blueprint/things/membership/roles.ts
import { Blueprint } from "orthograph";
import { Membership } from "./thing.ts";

// The person the seat belongs to.
export const holder = Blueprint.role(Membership, { rule: (membership, caller) => membership.person === caller.person });
```

```ts
// capxul/blueprint/things/membership/verbs/list.ts
import { Blueprint } from "orthograph";
import { Membership } from "../thing.ts";
import { founder } from "../../company/roles.ts";

// Everyone in a company. Capxul lets any of its people list them (`member list`); "a member of the company named in
// the filter" is the same gap as the Director role (finding 3), so this slice lets only the founder list.
// A list read's payload is its `where` fields plus `cursor`, so the role's path is the `company` filter. The filter is
// optional, so a call that leaves it out has no company to check and is refused: listing always names a company.
export default Blueprint.read(Membership, {
  where: ["company"],
  order: "oldest",
  page: 50,
  allowed: [founder.of("company")],
  budget: { p95: "100 millis" },
});
```

```ts
// capxul/blueprint/things/invitation/thing.ts
import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";

export const Invitation = Blueprint.thing({
  description: "An offer of a member's seat in a company, sent to an email address. Whoever signs in with it may answer.",
  code: "IN",
  fields: {
    id: Blueprint.id("inv"),
    company: Company.fields.id,
    email: Blueprint.email(),
    invitedBy: Blueprint.id("per"),
  },
});
```

```ts
// capxul/blueprint/things/invitation/machine.ts
import { Blueprint } from "orthograph";
import { Invitation } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Invitation, {
  states: ["pending", "accepted", "declined", "revoked"],
  moves: {
    send: { from: [], to: "pending", emits: Events.InvitationSent },
    accept: { from: ["pending"], to: "accepted", emits: Events.InvitationAccepted },
    decline: { from: ["pending"], to: "declined", emits: Events.InvitationDeclined },
    revoke: { from: ["pending"], to: "revoked", emits: Events.InvitationRevoked },
  },
  // Capxul answers "accept" on an accepted invitation with no change; here every move from a closed state is refused
  // (finding 5).
  notFrom: { exit: 40 },
});
```

```ts
// capxul/blueprint/things/invitation/events.ts
import { Blueprint } from "orthograph";
import { Invitation } from "./thing.ts";
import { Membership } from "../membership/thing.ts";

// Capxul's events never carry the email (packages/blueprint/src/things/invitation/events.ts:13), and neither do these.
export const InvitationSent = Blueprint.event({ invitation: Invitation.fields.id, company: Invitation.fields.company });
export const InvitationAccepted = Blueprint.event({ invitation: Invitation.fields.id, membership: Membership.fields.id });
export const InvitationDeclined = Blueprint.event({ invitation: Invitation.fields.id });
export const InvitationRevoked = Blueprint.event({ invitation: Invitation.fields.id });
```

```ts
// capxul/blueprint/things/invitation/errors.ts
import { Blueprint } from "orthograph";

export class AlreadyAMember extends Blueprint.error({}, { exit: 30 }) {}
// One pending invitation per company and email: needs uniqueness over two fields (finding 4), so a handler refuses it.
export class AlreadyInvited extends Blueprint.error({}, { exit: 31 }) {}
```

```ts
// capxul/blueprint/things/invitation/roles.ts
import { Blueprint } from "orthograph";
import { Invitation } from "./thing.ts";

// Whoever signed in with the address it was sent to. With wallet sign-in, a caller may have no email at all
// (question 1).
export const invitee = Blueprint.role(Invitation, { rule: (invitation, caller) => invitation.email === caller.email });
```

```ts
// capxul/blueprint/things/invitation/verbs/send.ts
import { Blueprint } from "orthograph";
import { Invitation } from "../thing.ts";
import { machine } from "../machine.ts";
import { AlreadyAMember, AlreadyInvited } from "../errors.ts";
import { founder } from "../../company/roles.ts";

export default Blueprint.operation(Invitation, {
  description: "Invite someone into a company by email, as a member.",
  payload: { company: Invitation.fields.company, email: Invitation.fields.email },
  answer: { invitation: Invitation.fields.id },
  move: machine.moves.send,
  errors: [AlreadyAMember, AlreadyInvited],
  allowed: [founder.of("company")],
  steps: { load: Blueprint.step.database(), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
```

```ts
// capxul/blueprint/things/invitation/verbs/accept.ts
import { Blueprint } from "orthograph";
import { Invitation } from "../thing.ts";
import { machine } from "../machine.ts";
import { invitee } from "../roles.ts";
import { Membership } from "../../membership/thing.ts";

export default Blueprint.operation(Invitation, {
  description: "Accept an invitation and take a member's seat in its company.",
  payload: { invitation: Invitation.fields.id },
  answer: { company: Invitation.fields.company, membership: Membership.fields.id },
  move: machine.moves.accept,
  allowed: [invitee],
  steps: { join: Blueprint.step.database({ writes: [Invitation, Membership] }) },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
```

`decline.ts` and `revoke.ts` follow the same shape: `decline` by the `invitee`, `revoke` by `founder.of("invitation.company")`,
each one database step. A list read of a person's own invitations is the same gap as the Director role: "invitations whose
email is mine" filters by the caller, not by a field.

```ts
// capxul/blueprint/projections/wallets.ts: mounting the wallets plugin, as the model draft's mount step does
import { Blueprint } from "orthograph";
import wallets from "@orthograph/wallets"; // the form `ortho add feature` writes (packages/cli/src/modules/mounting/internal/scaffold.ts:27-30 on goal/stage-1)

export default Blueprint.use(wallets);
// Mounting gives keys, signing and sending (packages/wallets/README.md:1-5 on goal/stage-1), not sign-in. Signing in
// with a wallet is `link` in M2.13, not built (finding 1); story 8 stays blocked.
```

```ts
// capxul/blueprint/starting-worlds/founded.ts: the journey author's file, sketched for the shape
import { Blueprint } from "orthograph";
import found from "../things/company/verbs/found.ts";

/** Dana has founded Northwind and is its only Director. */
export default Blueprint.startingWorld("founded", {
  cast: { dana: Blueprint.signedIn },
  makes: (s) => [s.dana.run(found, { handle: "northwind", name: "Northwind Trading", country: "NL", directors: [] })],
  gives: (s) => ({ company: s.last.company }),
});
```

The two worlds in Capxul's own blueprint that this matches are `fresh` and `founded` (`packages/blueprint/src/starting-points/points.ts`);
`invited` follows the starter's (`examples/starter/blueprint/starting-worlds/invited.ts:7-12`).

## 4. What Foreman would ask Aaron

Batched, for the ear, each with a recommendation first. The first four block the slice.

1. **What does signing in with a wallet mean for this slice?** Capxul's own decision is one sign-in and one signer per
   person, with a personal Safe whose address comes from their email (`docs/decisions.md:52`). Orthograph has email
   sign-in through Better Auth, and plans linking a wallet to that session (the milestone for linking, M2.13). I'd say:
   sign in by email now, and link a wallet to the person; the email-derived Safe comes with the chain slice.
2. **Does this slice include the company's Safe and the Directors signing its setup?** I'd say no. Directors and the
   threshold are data now; the Safe and the signatures come with the Safe plugin Orthograph plans for stage 3. Otherwise
   the slice waits on the whole chain.
3. **Company, members and invitations: Capxul's own code first, or Orthograph's planned organisations plugin?**
   Orthograph plans an organisations plugin built from its starter's copies (milestone M2.07). Your rule is to build a
   thing once in an app, use it, then extract it, and the starter is a template, not a use. I'd say: build it in Capxul
   first, under Capxul's words, then extract it when a second app needs it.
4. **Is "company" the word?** Capxul says company; Orthograph's starter and its planned plugin say organisation, and a
   mount can't rename (finding 9). I'd say: company in Capxul now; the plugin's name is decided at extraction.
5. **Still only the founder invites?** That's Capxul's decision of 15 November (`docs/decisions.md:41`). I'd say yes,
   with Directors added when the Director role can be written.
6. **Founded in one step with its Directors named, or found first and add Directors after?** Capxul founds in one step
   (`packages/blueprint/src/things/company/verbs/create.ts:14`). I'd say found with Directors named, because the threshold
   needs them; members come in by invitation only.
7. **Where does a Capxul world run?** Capxul's rule is that a world never lives on the agent's own machine
   (`docs/roadmap.md:22`); Orthograph's worlds run locally. I'd say locally for this slice, which needs no chain and no
   business site, and in the cloud when those join.
8. **Can an invitation be revoked, and does it expire?** Capxul adds cancelling later; the starter has revoke. I'd say
   revoke now, by the founder, and no expiry.

Each answer goes in the brief's Decisions (F9, section 5), and the blanks it closes are filled the same turn. Agreeing
the slice's brief and blueprint, and moving to the next stage, are the two things Foreman asks for (F9, section 10).

**The calls, 21 November 2026.** This record landed under Aaron's standing authority to take the recommendation on
anything waiting on him (F9, opening). Where Aaron had already answered in Capxul's own session on 20 November, by
saying yes to that session's recommendations as a batch, his answer stands instead of this one:

| # | Call | Why |
|---|---|---|
| 1 | Answered by Capxul's own call: people without a key sign in through an embedded wallet (Openfort), agents and everyone else bring their own key, and personal accounts are ordinary deployed Safes. The email sign-in recommended here is only Orthograph's floor until then | Capxul's call is newer and Aaron's |
| 2 | No Safe in this slice. And this slice is no longer Capxul's first: Capxul's own call puts one person getting paid ahead of the Safe plugin, the company and invitations | Capxul's call |
| 3 | Capxul's own code first, extracted when a second app needs it | the recommendation |
| 4 | "Company" | the recommendation, and Capxul's own call; K22 now lets an app give a mounted thing its own name, so the clash with "organisation" goes away |
| 5 | Only the founder invites, with Directors added once the Director role can be written (K20 decides how) | the recommendation |
| 6 | Founded in one step with its Directors named | the recommendation |
| 7 | Locally for this slice; in the cloud when the chain and the business site join | the recommendation |
| 8 | Revoke now, by the founder; no expiry | the recommendation |

## 5. Findings

### Where Orthograph fell short

1. **No sign-in with a wallet.** An environment's identity is test people or Better Auth
   (`packages/orthograph/src/modules/identity/service.ts:4-5`). Linking a wallet to a session is planned (M2.13 in
   `design/milestones.md:266`) and a spike proved it, for ordinary wallets only: "Yes, for EOAs"
   (`spikes/authenticated-siwe-link/README.md:5`). Capxul's signer is a Safe, a smart-contract account, whose signature
   that spike didn't cover. Story 8 can't be walked.
2. **Auth and organisations are copies, not plugins.** Both are planned (M2.05 and M2.07), and the extraction loop has
   never run end to end (the model draft, section 3). Capxul's first slice is almost exactly the planned organisations
   plugin, so it is either the plugin's first real user or another copy.
3. **A role can't say "a Director of this company" or "a member of this company".** A role is a rule over one record
   (`examples/starter/blueprint/things/organization/roles.ts:5`), and Directors are rows of another thing. The planned
   `holds` (M2.07, `design/milestones.md:261`) is meant for this. Until then the Director role is a blank, and listing a
   company's people is founder-only. *Decided since (not built):* a role can be held through another thing's rows
   (`design/decisions/K20-roles-across-things.md`, 20 November 2026).
4. **No uniqueness over two fields.** Unique keys are one field each (`packages/orthograph/src/modules/things/types.ts:46`
   on goal/stage-1), though the decision designs a tuple of fields for a composite key
   (`design/decisions/G5-invariants.md:90` on goal/stage-1, which replaces the per-field `unique:` spelling this slice
   uses with `Blueprint.invariant.unique`). One seat per person per company, and one pending
   invitation per company and email, both need it. Story 6 can't be walked without a handler doing the store's job.
5. **No "nothing changed" move.** Capxul's machine answers accepting an accepted invitation with no change
   (`packages/blueprint/src/things/invitation/lifecycle.ts:39`). Orthograph's `notFrom` refuses every move from a wrong
   state (`examples/starter/blueprint/things/invitation/machine.ts:12`). *Decided since (not built), with finding 6:* a
   repeated call answers, changes nothing and emits nothing, rather than being refused
   (`design/decisions/K21-a-repeat-changes-nothing.md`, 20 November 2026).
6. **Idempotent by intent, not only by request.** Capxul's founding answers `Resumed` for the same founding sent again
   and refuses a changed one with `FoundingChanged`, with no request key
   (`packages/blueprint/src/things/company/verbs/create.ts:40-47`, `:152-155`). Orthograph's `idempotent: "request"`
   replays by request key (`packages/orthograph/src/modules/operations/types.ts:56` on goal/stage-1).
7. **Every Capxul refusal's exit code collides.** Capxul's refusals use exits 2 and 4
   (`packages/blueprint/src/things/company/refusals.ts:11`, `:58`). Orthograph keeps 0 to 4, and 120 to 125, for the
   runtime (`design/decisions/G3-runtime-exits.md:1`, `:28` on goal/stage-1), so each moves to 5 to 119.
8. **No declared signing by several people.** Capxul's founding answers the approvals its Directors must sign, and a
   later `approval.sign` collects them (`packages/blueprint/src/things/company/verbs/create.ts:147-149`). Orthograph's
   nearest is an action that asks its own caller first (`needsApproval`, M1.23); the Safe, hats and budgets are stage 3
   plans (the model draft, section 4), and so part of the 1.0 release, not the preview or the beta (`design/decisions/K28-releases.md:20`).
9. **A mount can't rename what it brings.** A mount's verbs are choose, include, narrow and omit
   (`packages/orthograph/src/modules/plugins/service.ts:36-39` on goal/stage-1), and `ortho add feature --as <name>`
   names the mount, not its things (`packages/cli/src/modules/mounting/README.md:3` on goal/stage-1), so a plugin's
   "organisation" can't be an app's "company". *Decided since (not built):* an app can give a mounted thing its own name
   (`design/decisions/K22-a-mount-names-its-things.md`, 20 November 2026).
10. **A mount is app-wide.** It can't be limited to the development environment (`use` takes the plugin and its verbs, and no environment: `packages/orthograph/src/modules/plugins/service.ts:31` on
    `goal/stage-1`).
11. **A list of people is only a raw schema.** "The founding Directors, by person" can be written today as
    `Blueprint.value(Schema.Array(Blueprint.id("per").schema))` (the sketch does this). A raw schema's meta is just
    `{ type: "schema" }` (`packages/orthograph/src/modules/values/types.ts:22-25`, `service.ts:8` on goal/stage-1),
    so the model, the docs and the portal see a schema rather than a list of people. *Corrected 21 November 2026:* an
    earlier draft called this a blank. Codex pointed out that the raw schema already carries it.
12. **An app gets no builder guard.** Orthograph's own CI refuses a builder branch that edits checks (`builder-paths`);
    an app made by the preset has no such job, so lesson 5 rests on briefs alone (`F9-foreman.md`, section 9).
13. **What Capxul has that Orthograph might borrow.** Each Capxul operation carries its promises, in prose, each with
    its starting world and where it came from (kept, rewritten or dropped from the old stack)
    (`packages/blueprint/src/things/company/verbs/create.ts:122-198`), and its budget says what it leaves out and why
    (`:80-86`). Orthograph's journeys are separate files; prose stories are designed (`design/history/retired-2026-11-23/frame/skills.md:105`)
    and provenance isn't.

### Where the skills fell short

1. **The `shape` routine has no way to port a blueprint that already exists.** Step 2, "read what exists", was enough to read, but
   nothing maps a foreign blueprint's kinds onto Orthograph's: refusals, promises, starting points, roles, budgets. A
   `port-a-blueprint` step, with that table, is the missing piece; the table in section 2 is a first draft of it.
2. **`extract` has no rule for a plugin that exists only on paper.** Its trigger is "a second real user", which assumes
   the code lives in an app. Here the plugin is planned and Capxul would be its first real user (question 3).
3. **The walk-it check needs a "blocked by the framework" outcome.** Two stories can't be walked because of Orthograph,
   not the blueprint. The skill should record those as framework snags and let the rest of the slice proceed, rather
   than call the slice "not ready" as a whole.
4. **The grill format is too heavy for product questions.** The first draft of `F9-foreman.md` put every ask in the
   grill format in writing. That suits design forks; the eight product questions above are better as one numbered list
   for the ear, with the grill kept for a fork with code to compare. Changed in `F9-foreman.md` section 10 in the same
   pull request.
5. **The role skills are written for this repository.** The checks author would have to read past branch suffixes and
   ratchet files that Capxul doesn't have. `F9-foreman.md` section 9 moves them into the plugin, worded for any project,
   with this repository's own rules left in `AGENTS.md`.
6. **Nothing covers an outside system in the first slice.** Capxul's founding makes the company's business site on its
   Frappe bench. Orthograph designs that as a source through an adapter (`design/decisions/K3-stores-and-sources.md`),
   but no Foreman skill says how to cut it out of a slice or put it back.

### Where the original idea and Orthograph disagree

1. **Where worlds run.** Capxul: "A world never lives on the agent's own machine" (`docs/roadmap.md:22`). Orthograph is
   local first: worlds run in local workerd and D1 (the model draft, section 1, layer 5). Foreman's own board doesn't meet this
   choice until Capxul declares it (`F9-foreman.md`, section 5).
2. **Who holds authority.** Capxul: "The chain owns authority; business-system permissions reflect it"
   (`docs/grounding.md:16`). In Orthograph a role is a rule over database rows, and on-chain authority is a stage 3
   plugin. The first slice puts Directors in a table, which Capxul's idea gives to the chain.
3. **What identity is.** Capxul: one sign-in, one signer, a personal Safe from the email (`docs/decisions.md:52`).
   Orthograph: a Better Auth person, with ordinary wallets linked later.
4. **What the product is.** Capxul is "a hosted, re-skinned Frappe" with Capxul's money and authority built in
   (`README.md:3`). Orthograph has no business system; the portal is a developer's console, and an app's own screens are
   its own. Moving Capxul onto Orthograph moves its core, not its product surface.
5. **Words.** Capxul's glossary renamed its own words on 15 November: a starting world became a "starting point", a
   claim a "promise", a world's door its "endpoint" (`docs/decisions.md:70`). Orthograph's canon says starting world and
   journey. One of the two glossaries has to give way where they meet.
6. **Where they agree, which is most of the method.** Both have one blueprint that owns every fact and generate the
   rest; journeys written first by a different agent, failing on empty handlers (Capxul's step 1.14 in
   `docs/roadmap.md:100`); machines that refuse wrong moves and derive their database constraint (step 3.4,
   `docs/roadmap.md:113`); ratchets that may only shrink; one glossary. Orthograph is recognisably Capxul's own discipline
   made into a framework. What changed on the way is the ground it stands on: local, database-first and plugin-shaped,
   where Capxul is cloud, chain-first and one product.
