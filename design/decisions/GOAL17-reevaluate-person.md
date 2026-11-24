# GOAL17-reevaluate-person: "(person)" means a person principal, and who may reevaluate a trigger

**Decided 24 November 2026** by Goal 16 Capxul core, under CX-takeover (Goal 17 is not running), on the question from snag #953's checks
author. Check 28 is its check.

## The question

`design/goals/17-superagent.md`, the Trigger row, gives `reevaluate` to "(person)". `trigger.reevaluate` declares
`allowed: [Blueprint.signedIn]`. #953 read "(person)" as "a person of that superagent", but nothing in the model ties a person to a
superagent: `Superagent` has no owner or team field, and teams ("who owns a superagent and who shares it") are slice 15's.

The hole that is there today is another one. `Blueprint.signedIn` admits an agent acting as itself too (`acting()` in
`packages/language-effect/src/modules/access/service.ts` takes a person or an agent). So any main agent or executor, of this superagent or
another, can release any trigger an expired eval holds. The brief gives the main agent `requeue`, not `reevaluate`.

## The call

- **"(person)" on an operation in the brief's spec table means a person principal:** someone signed in by a session, a key or a device,
  never an agent. "(main)" and "(executor)" name the agents, and "(person, main)" both. "(person; main proposes)" is a person's, and a
  main agent's call records a Proposal instead.
- **`trigger.reevaluate` is `allowed: [Blueprint.signedIn.notVia(Via.agent)]`,** as acme's `invitation.accept` has it. It is then not an
  agent's tool. Check 28 refuses another superagent's main agent, this superagent's own main agent and its executor `NotAllowed`, with
  nothing written, and lets a person signed in by a session, a key or a device reevaluate, on either of two superagents, writing only
  that trigger's release.
- **Scoping to a person of that superagent waits on slice 15's teams.** When teams exist, `reevaluate` gains a role path to the trigger's
  superagent, as `requeue` has one to its main agent.

Why not an owner relation now: it would design slice 15's teams inside a snag.

## Follow-ups, not fixed here

Other person operations admit an agent through a plain `Blueprint.signedIn` entry too, so they have the same hole. Among them:

- `source.save`, `source.enable`, `source.disable`;
- `account.list`, `account.unlist`, `account.sync`;
- `prompts.save`, `prompts.preview`, `prompts.history`;
- `decision.dismiss`, `policy.save`, `policy.history`, `policy.restore`, `policy.sync`, `settings.save`;
- the "(person, main)" ones, `ticket.stop`, `ticket.retry`, `ticket.requestStatus` and `thread.unsubscribe`, whose `signedIn` entry admits
  any agent, an executor or another superagent's main agent among them.

For the "(person; main proposes)" ones (`account.*`, `policy.save` and `sync`, `prompts.save`, `settings.save`) the brief says a main agent's call records a Proposal, so their fix goes with that
proposal path rather than a plain `notVia`. Each needs its own check first.
