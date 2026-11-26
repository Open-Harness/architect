# K33: the work lives on GitHub, natively

**Decided 21 November 2026 by Aaron**, to the 📐 designer thread: make K32's practice "a bit more GitHub native …
with issue types and labels … and also have different milestones for different goals", with "a little bit of a
foundation slice" that lands it with the new templates and skills, seeded "with the missions that we currently have",
and with front matter, so anyone can tell "what agent is working on what, and what harness, and what model". It builds
on K32 (goals coordinate themselves, through git and GitHub) and changes one thing in it: milestones are per goal, not
per release.

Before seeding, Aaron asked to slow down: how is a goal said "in a clear, human-readable, non-jargon" way, "not assuming
that you've read everything else", with "what it is, what it isn't"; should a snag be its own type; how is every issue
linked to its goal; and how do we "see where we are in the progress of that goal in one way". The grill put four
questions, and on 21 November 2026 Aaron answered: **1A** a plain goal card at the top of every brief, copied to the
goal issue; **2A** ("let's go A") the repository moves into an organization, so each kind is a real issue type;
**3A** milestone, sub-issue and blocked-by links, each with one job; **4B** ("we are already all in") a GitHub Project
is where progress is seen, with the goal issue as each goal's page beside it.

## The problem

K32 moved coordination off chat and onto git and GitHub, but by convention in prose. GitHub itself held almost
nothing of the shape, as it stood on 21 November 2026:

```text
$ gh api repos/AaronAbuUsama/architect/milestones --jq '.[].title'
Preview
Beta
1.0                                 # one milestone per release, so no page shows one goal's work
$ gh api graphql … issueTypes       # Task, Bug, Feature: the only types; custom types need an organization
$ ls .github/ISSUE_TEMPLATE         # none: an issue is free text, so nothing can be filtered by what it is
$ grep -c '^| `' design/ledger.md   # 731 rows of open problems, in a file nothing on GitHub can see
```

- **A goal's work is nowhere in one place.** Its pull requests carry a `goal-<n>` label and a release milestone, its
  slices live only in its brief's tables, and its snags in a Markdown file.
- **Nobody can tell who runs what.** Every agent uses one GitHub account; the harness and model of a goal's lead were
  written nowhere, and the claude.ai kanban that tracked threads can't be reached from Amp or Codex.
- **Every kind of work looked the same.** A snag, an ask between goals and a slice were all free-text issues.

## What is decided

1. **A milestone per goal** (Aaron). `Goal <n>: <title>`, its description naming the brief and the done check. Every
   issue and pull request of a goal carries it, so the milestone page is the goal's progress. GitHub allows one
   milestone per issue, so **the release becomes a label**: `release:preview`, `release:beta`, `release:1.0` (K28's
   three). The `goal-<n>` labels K32 made stay, mirroring the milestone, so lists of pull requests filter by goal too.
   Superseded by K42, 23 November 2026: GitHub milestones are the apps' milestones, and an item (one row of
   `docs/canon/status.md`) sits in the first app milestone that pulls it; a goal's own milestone holds only its goal
   issue, slices and snags, and closes when the goal stops.
2. **Six kinds of issue, each a native type, a `kind:` label and a form** (`.github/ISSUE_TEMPLATE/`, blank issues
   off):

   | Kind | Type | What | Milestone |
   |---|---|---|---|
   | `kind:goal` | Feature | one per goal, the parent of its slices | its goal |
   | `kind:slice` | Task | one per slice, a sub-issue of the goal issue, closed by the pull request that lands it | its goal |
   | `kind:snag` | Bug | something a goal hit and couldn't fix in its own paths: its own snags only | its goal |
   | `kind:ask` | Task | one goal asking another to act | the goal that must act |
   | `kind:decision` | Task | a call waiting to be made, closed by the pull request that records it | the goal that decides |
   | `kind:gap` | Task | a ledger row picked up as work, titled with its ledger id | the goal that closes it |

   Superseded by K42, 23 November 2026: an item is a `kind:capability` or `kind:gap` issue written from its row on the
   status page, `kind:ask` is only for two goals' overlapping claims (K42, section 3, case 2), and a grill is a
   `kind:decision` issue labelled `needs-aaron`.

   Custom issue types need a GitHub organization, and Aaron chose them (2A): the repository moves into one, and the
   sync then makes six types, Goal, Slice, Snag, Ask, Decision and Gap, and sets each issue's type from its kind. Until
   the move, the native type in the table stands in. The `kind:` labels stay after the move: the forms add them, and
   the Project's Kind field and every filter read them, so nothing depends on which types the owner has.
3. **Three links, each with one job** (Aaron, 3A). The **milestone** says which goal. **Sub-issues** are the goal's
   steps: the goal issue's sub-issue list is the brief's slice list, so GitHub's bar counts only slices. A slice
   closes when the pull request that lands it merges: by `Closes #<n>` into main, or by its author with `gh issue
   close` into a goal branch, since GitHub closes issues by keyword only on the default branch. **Blocked by** says what waits on what: the sync links each slice to the
   slices the brief says it comes after (`"5 · The shell (after 4)"`), and an agent links a slice to the snag or the
   ask that stops it, by hand (the `github` skill).
4. **Who works on what is written in three places,** since one account does everything:
   - the brief's front matter, `lead: { harness, model, since }` and `status:`, set by the lead when it starts and
     mirrored into the goal issue;
   - every pull request's labels, `role:<role>` and `harness:<harness>` (`harness:claude`, `harness:amp`,
     `harness:codex`, `harness:opencode`, the last added 21 November 2026 on Aaron's word), and the template's
     "Harness and model" line; a model is never a label, since models change weekly;
   - a comment on the slice issue when an agent takes it: `[goal-<n> · <role> · <harness> · <model>] Taking this.`;
   - and the same first line on every comment an agent posts, anywhere (item 15).
   None of this is an attribution line in a commit; it is data on the work.
5. **Front matter on every goal brief.** A small YAML subset (the parser in `tools/github/frontmatter.mjs` refuses
   anything else): `goal`, `title`, `milestone`, `release`, `branch`, `base`, `status`, `lead`, `done_check`, `owns`,
   `slices`. The brief stays the whole context (K32); the front matter is the part a machine reads.
6. **The sync mirrors the briefs onto GitHub.** `tools/github/sync.mjs`, dry run by default, `--apply` to write: the
   labels, a milestone per goal, the goal issue and a sub-issue per slice, keeping the goal issue's body equal to the
   front matter. It finds its issues by a marker in their body, never by title, never deletes (superseded by K44, 25 November 2026: it removes a blocked-by link between two of a goal's own slices that the brief no longer gives), and running it twice
   changes nothing (its tests, `tools/github/sync.test.mjs`). `--migrate` moves open issues and pull requests from
   `goal-<n>` labels and release milestones to goal milestones and release labels, once.
7. **Snags are issues from now.** A goal's new snags are Snag issues in its milestone, so they can be filtered, linked
   and closed by the pull request that fixes them. The `<nn>-snags.md` files stay as the record of what came before.
8. **The ledger stays one file.** `design/ledger.md` is cited by id across the design. A row becomes a Gap issue only
   when someone picks it up or a release needs it; the row gains the issue's link in the pull request that closes it.
   No bulk import: 518 open rows would bury every goal's own issues.
9. **Review comments are marked** `blocker:`, `nit:` or `question:` (the `github` skill). A nit never blocks but is
   never left open: the author answers "taken" or "left: <why>" and resolves it, as branch protection already
   requires of every thread.
10. **A pull request template** (`.github/pull_request_template.md`): the issue it closes, goal and slice, role,
    harness and model, the check and what it printed; what it changes, what it touches, what is not done or not
    verified.
11. **A `github` skill** (`.agents/skills/github/`) says all of this for every agent, in any harness.
12. **A plain goal card opens every brief** (Aaron, 1A): `## The goal, in plain words`, after the start line, with
    eight bullets: in one sentence, why, when it's done you can, it is, it isn't, done when, waits on, words used. No
    ids, file paths or unexplained terms, about twenty lines at most; the details stay below it, for the lead. A 🔍
    reviewer checks it by reading the card alone. The sync copies it, word for word, to the top of the goal issue.
13. **The goal issue is each goal's page** (1A, with 4B's Project beside it for progress across goals). The sync
    writes its body: the card; the progress (slices done
    of all, and which are ready now, every slice they come after done and nothing open blocking them); the open Snag
    issues in the milestone and the slice each blocks; what waits on other goals (an open issue in another milestone
    that blocks one of its slices); who leads it (status, harness, model, since); the brief's "Where it stands"; and the
    details (branch, release, done check, what it owns). The `goals` workflow (`.github/workflows/goals.yml`) reruns the
    sync, one run at a time, when a brief changes on `main`, when an issue opens, closes or changes milestone or label,
    and every three hours, so the page stays true without anyone running it. It reads the briefs on `main` and, for a
    goal whose brief is only on its goal branch, that branch (`--goal-branches`); a goal's status, lead and "Where it
    stands" come from its goal branch whenever the brief is there, since the lead rewrites them in each slice's pull
    request into that branch.
14. **Only trusted issues count.** The repository is public and a form adds its kind label, so the sync takes an issue
    for its own, or lists it on a goal page, only when the owner, a collaborator or the workflow opened it; and the
    oldest wins, so a later copy of a marker displaces nothing.
15. **Every comment an agent posts names itself** (Aaron, to the conductor: goals "can leave comments and … identify
    where they've come from, who they are"). Its first line is `[goal-<n> · <role> · <harness> · <model>]`, the
    conductor writing `conductor` in the goal's place. It is data on the work, like the labels, not an attribution line.
16. **One GitHub Project, "Orthograph", over every goal** (Aaron, to the conductor, 21 November 2026: "we will be
    moving to GitHub projects with each of these goals being native to that GitHub projects … Goals are independent and
    asynchronous … they own their own goal"). One Project, owned by whoever owns the repository (the organization, after the move), not one per goal, so every goal shows on one board
    and an ask between two goals is seen by both. It is laid over the milestones, sub-issues and labels, which stay as
    above, and holds:
    - **items:** every goal, slice, snag, ask, decision and gap issue in a goal's milestone;
    - **fields:** Goal, Kind, Status (Ready, Running, Blocked, Landing, Done, Parked), Release, Harness, Model (text,
      since models change weekly), Lead role, and Start and End (the dates an issue opened and closed; a goal's Start is
      its lead's `since`);
    - **views:** "All goals" (a table), "By status" (a board), "Roadmap" (Start to End), and one table per goal,
      filtered by Goal. GitHub's API can't set a view's grouping, so "Roadmap" and "All goals" are grouped by Goal by
      hand, once, in the Project's settings.
    The sync keeps it (`--project`): it adds the items and keeps their fields equal to the briefs and the issues. A goal
    item's Status, Harness and Model come from its brief's `status:` and `lead:`; a slice's or snag's Status is Done
    when closed, Blocked while an open issue blocks it, Running once an agent has put its `harness:` label on it, and
    Ready otherwise; one parked by hand stays Parked while it is open. Model and Lead role are set when known and never
    cleared, so an agent may set them by hand. A Project needs the token's `project` scope: without it a dry run shows the Project's plan and `--apply` writes
    nothing. The `goals` workflow's own token can't reach a Project, so it keeps the Project only once a token
    with that scope is saved as the `ORTHOGRAPH_PROJECT_TOKEN` secret, which is a credential and waits on Aaron's yes;
    until then a local run keeps it.

## Seeded, 21 November 2026

Aaron said "lets do github now", so the sync ran before the move (`--goal-branches --migrate --project --apply`), from
the briefs on `main` and on the goal branches. It made:

- the 20 labels in `tools/github/plan.mjs`;
- five milestones, one per goal: Goal 3 (from `03-stage-1-hill-climbed.md` on `main`), Goal 4 (`04-on-chain.md` on
  `goal/on-chain`), Goals 5 and 6 (this change) and Goal 7 (`07-safe-hats.md` on `goal/safe-hats`);
- a goal issue each, written as the goal's page: #307 (Goal 3), #308 (Goal 4), #309 (Goal 5), #315 (Goal 6) and
  #328 (Goal 7);
- for Goals 5 and 6, the briefs with front matter, 17 slice issues as sub-issues of their goal issue, and 20
  blocked-by links for their order;
- 19 open issues and pull requests moved from their `goal-<n>` labels and release milestones to their goal's milestone
  and release label;
- the Project, Orthograph, first under Aaron's account (since closed; see below), with its nine
  fields, eight views (All goals, By status, Roadmap, and one per goal) and all 22 issues as items, their fields set.

The Preview, Beta and 1.0 milestones were then empty, and were closed, not deleted. A second dry run planned nothing.
Goals 3, 4 and 7 get their cards and slices on GitHub when their leads add front matter to their briefs, as their next
brief edit (K32 already asks each to adopt it, #299 and #300). The goal pages link to their briefs on `main`, so the
links for Goals 5 and 6 work once this change merges.

## Moved into Open-Harness, 21 November 2026 (2A)

Aaron chose `Open-Harness`, an organization he already owns ("Open harnes"), and the repository was transferred on his
yes: it was `Open-Harness/architect`, and the old address redirects. The same day Aaron renamed it ("since we are here we
rename orthograph"): it is `Open-Harness/orthograph`, and both old addresses redirect. The issues, milestones, labels, sub-issues and
blocked-by links moved with it. Checked straight after the transfer, against a snapshot taken just before it:

- branch protection on `main`, `m1`, `goal/stage-1`, `goal/ui-layer`, `goal/portal` and `goal/on-chain`: the same;
- the `staging` and `links-staging` environments, their branch rules and their secrets' names: the same;
- the repository's Actions secrets, by name only: the same three; its settings and its Actions permissions: the same;
- git remotes and `gh`: they resolve through GitHub's redirect.

Still to do, in this order:

1. **Aaron gives the apps the repository.** The Claude app is installed on Open-Harness for selected repositories, so
   `architect` is added to it; Codex's connector is installed on the organization. Until then, Codex reviews and
   Claude's Auto-fix don't reach this repository.
2. **Done the same day.** Aaron granted the token `admin:org`, which GitHub requires to make an organization's issue
   types (the sync stops before writing anything without it). One sync run (`--goal-branches --project --apply`) then
   made the six types, Goal, Slice, Snag, Ask, Decision and Gap, and set every issue's; rewrote the goal pages with the
   new address; added Goal 4's slices, `1b` among them, from its brief on `goal/on-chain`; and made the Project again
   under the organization, [Orthograph](https://github.com/orgs/Open-Harness/projects/1), with its fields, views and
   items. A second dry run planned nothing. The Project under Aaron's account was closed, not deleted, with a pointer
   to the new one.
3. The issue forms name the new types (`type: Snag` and the rest), which now exist, so this change can merge.

The live docs now name `Open-Harness/orthograph`. The old address stays in the dated records, in spikes (records of
their run), and in the naming check (`e2e/m0/names.test.ts`, which tests that the address isn't flagged); the redirect
covers each.

Follow-ups an organization opens, not part of this change: a merge queue on `main`, and Blacksmith's free tier for CI
runners.

## Not chosen

- **A Project per goal:** an ask between two goals would sit on one goal's board only, and nothing would show every
  goal at once. One Project with a view per goal gives both.
- **Milestones per release** (K32's first form): a goal's work would be split across three pages and mixed with every
  other goal's.
- **Assignees per agent:** every agent is one GitHub account.
- **The ledger as 731 issues.**
- **Native types and labels only** (2B, the first recommendation): Aaron chose real types.
- **The goal issue as the only progress page** (4A, the first recommendation): Aaron chose the Project, which shows
  every goal at once; the goal issue stays as each goal's page.
- **The goal issue as the source** (1B): a definition edited on GitHub skips review and leaves the repository.
- **Every issue a sub-issue of its goal** (3C): snags and asks would count as progress, and an ask can't sit under
  both goals.
- **A GitHub wiki** (Aaron asked, 21 November 2026): a wiki is a second git repository beside this one, edited without
  pull requests or review, not in any agent's checkout, and it would copy what `design/` already holds. The goal pages
  are the plain front door instead; the generated docs site is the reader's one later.

## Reversible

Everything on GitHub is made by the sync from files, finds itself by a marker, and is never deleted by it. Labels and
milestones can be renamed or closed by hand; the briefs keep the truth either way.

## Supersedes

From K32 (#298), which merged as written; its words gain a "Superseded by K33" note:

- design/decisions/K32-goals-coordinate-themselves.md: "**A milestone per release** (K28)" → "**A milestone per goal** (K33), and a `release:<name>` label per release"
- design/decisions/K32-goals-coordinate-themselves.md: "Its own snags go in" → "Its new snags are Snag issues in its milestone"
- design/decisions/K32-goals-coordinate-themselves.md: "labelled with the goal that must act" → "an Ask issue in the milestone of the goal that must act"
- design/decisions/K32-goals-coordinate-themselves.md: "GitHub Projects adds a second board" → "One Project, \"Orthograph\", over every goal"

From the live docs that still said release milestones and snag files:

- AGENTS.md: "a `goal-<n>` label, the release milestones, and issues for asks between goals" → "its goal's milestone and `goal-<n>` label, and Snag and Ask issues in that milestone"
- .agents/skills/conductor/SKILL.md: "its snag file, its `goal-<n>` label and issues" → "its milestone and `goal-<n>` label, and its Snag and Ask issues"
- .agents/skills/conductor/SKILL.md: "its snag file, the `goal-<n>` label and the release milestones on GitHub" → "its milestone on GitHub, with its Snag and Ask issues"
- .agents/skills/threads/SKILL.md: "its snag file; a `goal-<n>` label on its pull requests and issues; and an issue labelled for another goal" → "Snag issues in its milestone; its milestone and `goal-<n>` label on its pull requests and issues; and an Ask issue in another goal's milestone"

From #285:

- design/milestones.md: "Goal 3's lead has agreed the freeze on a `goal-3` issue" → "Goal 3's lead has agreed the freeze on an Ask issue in Goal 3's milestone"
