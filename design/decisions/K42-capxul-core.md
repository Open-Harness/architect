# K42: Capxul core is free software in ERPNext's shapes; people pay for verification, bank accounts and incorporation

**Decided 23 November 2026** with Aaron, by voice, in the same conversation as K41, and with it (#694). It
says what "Capxul runs on Orthograph" means. K41 makes that the 1.0 release, and this record gives the Capxul goal
(Goal 16) its shape.

## The problem

"Capxul on Orthograph" meant two different things. Goal 16's map (`M7-capxul.md`, on #487) keeps Frappe, ERPNext,
HRMS and Frappe CRM running beside Capxul as Capxul's own, with Frappe's desk keeping the books and reports. It also
builds Capxul in its own repository, from npm. Aaron means something else.

## Aaron's calls

Heard through speech to text and kept as heard; "Capsule" is Capxul.

1. **Translate, don't run beside.** "Taking those ideas from Capsule Next, making them orthograph native ... it should
   be the same shapes as ERP Next. Obviously, we're going to render our own UI because we're going to use our own
   framework ... not clean room, but translating the logic from the ERP Next applications into Capsule".
2. **The order.** "The high priority ones are obviously the books, HR, payroll, and then after that, the CRM."
3. **Bridge is core.** "We need to do the bridge integrations as well ... that is core and fundamental to how ... our
   capsule core fits in with the rest of it."
4. **Core and modules.** "How do we organize this ... into capsule core, into like extra modules basically, like a CRM
   for instance ... Maybe that could be something that could be switched on after the fact."
5. **The software is free; verification and help are paid.** "Everything is just available, right? But if you pay us,
   right, then you get access to the KYB, KYC features, right? Furthermore, we can help you with incorporation ...
   the software itself, it should just be free."
6. **Bank accounts are paid.** "Being able to issue them a bank account, this is a paid feature ... they need to have
   some sort of maintenance to keep the accounts open".

Still open, in his words: the network, meaning other companies and their agents reached through the CRM, plus
meetups, mixers and workshops, "a really undecided thing".

## The decision

1. **One product, built natively on Orthograph.** Capxul's parts take the record shapes and logic of ERPNext, Frappe
   HRMS and Frappe CRM, translated into Orthograph things, machines, operations and journeys. Its screens are
   Orthograph's own (UI SDK and the generated pieces, K24 and K29). No Frappe runs inside it.
2. **Its layers:**
   - **Orthograph's library:** sign-in, organisations, wallets, the chain, events, workflows, agents and money. Every
     app uses these.
   - **Capxul core,** free and self-hostable: accounts, parties, invoices, payments, the books, HR and payroll, plus
     the Bridge adapter.
   - **Capxul modules,** also free, each a plugin a running Capxul mounts when someone switches it on, starting with the
     CRM. Orthograph hasn't proved it can mount a plugin into an app that already holds data. Capxul pulls that
     capability (K41).
   - **Capxul's paid services,** hosted by Capxul and reached from any Capxul through an adapter unlocked by a key:
     KYC and KYB; bank accounts through Bridge, both opening them and keeping them open; and help with incorporation.
   - **The network:** undecided. It becomes a grill when Capxul reaches the CRM.
3. **The order:** the books, HR, payroll, then the CRM. Bridge and the paid services come alongside the books, because
   money moving between an account and a bank goes through them. The first feature stays Goal 16's (`M7-capxul.md`,
   section 4), read as the books' first slice: a sales invoice with a pay link, the payment that settles it, and the
   ledger lines it posts.
4. **Where it is built:** in this repository, on `goal/capxul`. The app goes in `examples/capxul/` and its plugins in
   `examples/capxul/plugins/` (K39's call 7 shape). Framework gaps are built there under K41's collision rule. It moves
   to Capxul's own repository, as K30's option A planned, once Orthograph is on npm and Capxul's staging run passes.
5. **Licences:** ERPNext is under GPL version 3 and Frappe CRM under AGPL version 3 (Frappe's licence page,
   https://docs.frappe.io/legal/others/license-and-trademark). Frappe HRMS's licence is still to be read from its
   repository. A close translation likely carries the original's licence. That fits, because all of Capxul's software
   is free (call 5), but the paid services must contain no translated code. Before the Capxul goal translates
   anything, Aaron gets a lawyer's read. That is outward-facing, so the Capxul goal waits on him for it
   (`needs-aaron`).

## Open, for the Capxul goal's grill (its slice 1)

- Which licence Capxul's software carries.
- Which ERPNext record types (doctypes) each part takes, and which it drops: several companies, several currencies,
  fiscal years, cost centres.
- Money: ERPNext's currency amounts against Orthograph's base units (`M6-money.md`, on `goal/on-chain`).
- How a self-hosted Capxul reaches the paid services, and what it does without a key.
- The network.

## What was not chosen

- **Keep Frappe beside Capxul** (`M7-capxul.md`): two systems and two interfaces, and the books never become
  Orthograph-native.
- **Charge for the CRM or for modules:** Aaron, call 5. The software is free.
- **Build Capxul in its own repository from the start:** every framework fix would wait on an npm release. It moves out
  later instead (section 4).

## Supersedes

Applied with K41:

- `design/goals/16-capxul.md`: rewritten in this pull request (a live brief).
- `M7-capxul.md` (on #487, not yet on `main`): "Frappe, ERPNext, HRMS, Frappe CRM, and the site service | books, HR,
  CRM; the business site | **Capxul's own**" → "translated into Capxul core and modules (K42)"; "until then Frappe's
  desk keeps them" → "until then, none: Capxul builds its own reports"; "It is built in `capxul-next`, Capxul's own
  repository" → "It is built in this repository on `goal/capxul`, and moves out once Orthograph is on npm (K42)". These
  are marked "Superseded by K42" in that record when #487 lands.
- `design/scope.md`, section 5, item 4: "Answered by K30, section 2: after the beta, beside the stages, never gating
  1.0" → "Capxul core is 1.0 (K41, K42)"
