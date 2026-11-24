# GOAL17-person-sync: what a person's `policy.sync` does

**Decided 24 November 2026** by Goal 16's checks author, under CX-takeover (Goal 17 is not running), for snag #934 and the 🔍 of #940.

## The question

Two records say different things. GOAL17-source-from's table says a source's `sync` "makes `account.list` proposals from a collaborator
list or a user group". `design/goals/17-superagent.md` says listing an account is "the `Account` thing's `list` move, from the portal or by
`policy.sync`", and that `policy.sync` called by a main agent records a Proposal. A person's sync, then, either lists or proposes. The
journey "a main agent's configuration change only records a proposal" needs to know which, to tell a main agent's sync that was applied.

## The call

- **A source's `sync` names a roster:** the people and bots its service lists (a repository's collaborators, a user group).
- **A person's `policy.sync`** lists each **person** on the roster. It writes the accounts through its records, as `trigger.receive` makes
  the accounts it meets: one the superagent has never seen is made `listed`; one `seen` or `unlisted` becomes `listed`; one `listed`
  changes nothing. `policy.sync` has no move, so it journals no event of its own. A bot on the roster is not listed: bots are admitted by
  `policy.bots`, which a person edits.
- **A main agent's `policy.sync`** records one Proposal and lists nothing (17-superagent, unchanged).

So the journey "a main agent's configuration change only records a proposal" reads an applied sync by its result, with moves that exist
today: the door's `account.seen` for the stand-in's one person (GitHub 3) answers its account, made `seen` if new and kept as it was if
known, and ann's `account.list` of it emits `AccountListed` only if nothing listed it before. Had the main agent's sync been applied, the
listing would be refused (`list` moves from `seen` or `unlisted`).

Why not proposals for a person's sync: a person is who approves a proposal, so a proposal they must then approve themselves is one step
with two names. The portal's sync button is the person saying yes.

## Supersedes

- `design/decisions/GOAL17-source-from.md`: "`sync` makes `account.list` proposals from a collaborator list or a user group." → "`sync` names the roster that `policy.sync` lists: a person's sync lists each person on it, a main agent's records one proposal."
- `design/goals/17-superagent.md`: "`list` move, from the portal or by `policy.sync` from a Slack user group or a repository's collaborators." → "`list` move from the portal; `policy.sync` lists the people of a Slack user group or a repository's collaborators through its records (GOAL17-person-sync)."
