# The canon

The canon is Orthograph's documentation: one MDX page per concept, each explained once, in its own place. It is also the
spec. We build documentation first now, so a page says what the code must do before the code does it, and the code
is built to the page. When the two disagree, one of them is wrong, and the change that fixes it fixes both.

- [`outline.md`](outline.md): every page, its one job, the questions it answers, and the order to read them in.
- [`_template.mdx`](_template.mdx): the shape every page follows.
- [`components/`](components/README.md): the MDX components pages use, with their props.
- [`check.mjs`](check.mjs): the check that keeps pages true. `pnpm nx run canon:check` runs it.
- [`preview/`](preview/build.mjs): renders the whole canon into one HTML file you can click through, every component
  drawn from real data. `pnpm nx run canon:preview` writes `docs/canon/.preview/index.html`; open it in any browser.
- Written so far: layer 1, the shape ([`orthograph`](orthograph.mdx), [`blueprint`](blueprint.mdx), [`languages-and-hosts`](languages-and-hosts.mdx), [`plugins`](plugins.mdx), [`data`](data.mdx), [`doors`](doors.mdx)); from layer 2, [`things`](things.mdx), [`machines`](machines.mdx), [`operations`](operations.mdx) and [`handlers`](handlers.mdx); the samples [`stores`](stores.mdx) (a draft, rewritten in layer 4) and [`traces`](traces.mdx); and [`chains-and-wallets`](chains-and-wallets.mdx), the chain port and the wallet, written from the code (M1.39).

The canon describes all of 1.0, built or not, for Aaron and for anyone who builds on Orthograph or helps build it.
One example runs through it: Plugged In, [`examples/plugged-in`](../../examples/plugged-in), in the four stages it is
built in (K9); 1.0 itself is Capxul core on Orthograph (K42, K43). `outline.md` says which stage teaches which page, and K37 records the switch. acme stays the fixture the
tests and gates run on.

The map behind this plan, drawn for Aaron's review, is the canon board (a convenience: the link dies with the account,
and `outline.md` and K37 are the record): https://claude.ai/code/artifact/1ec0cf04-7096-44f5-a182-7c42b55ee37b.

The canon replaced the old one-page docs, `design/docs/index.html`, on 23 November 2026 (K41). That page is a record now,
in `design/history/retired-2026-11-23/docs/`, and the canon's check took over its link check. What is built, what is
left and the package map are on the status page, [`status.md`](status.md), which the check reads like this README.

## How a page earns its place

A page explains one concept that a reader needs and can't get from another page. To earn its place it must:

1. **Own its words.** Its frontmatter's `owns` lists the glossary words it defines. No two pages own a word. Every
   other page links to the owner and never explains the word again.
2. **Answer its questions.** Its `questions` are the ones a reader brings. A question the page doesn't answer means
   the page isn't done.
3. **Show it in Plugged In.** The smallest example is real code from `examples/plugged-in`, from the stage that
   needs it, quoted with its file and the name of the declaration, or designed code marked with the slice that
   builds it. A part not built yet is written now all the same, from its decision, and marked so.
4. **Say what it is not.** The near-misses, each pointing at the page that owns it. This is what stops two pages from
   drifting into explaining the same idea.
5. **Carry its own open questions.** Anything unsettled is a `<Note kind="question">` on the page, with the slice that
   must settle it. A doc with no open questions is either proved or hiding something.

Merge two concepts when a reader never asks about one without the other. Split one only when a reader looking for
one half would get lost in the other. `outline.md` records each merge and split, and why.

## The eight sections

Every page has the same eight sections, in this order. The check refuses a page that drops or reorders one. A page may
add its own section between them, as `traces.mdx` adds "The three gaps".

| Section | What it holds |
|---|---|
| The idea | one paragraph, and the one rule that decides it |
| The smallest example | the smallest real example from Plugged In, at the stage that needs it |
| How it works | the path, in the order the code runs it, with a scene where the path matters |
| Choices | each choice a reader makes, and what each option costs |
| What it is not | the near-misses, each linked to its owner |
| Where it lives | the code, as checked references, built or planned |
| Status | `<Status />`, then each part's status and the check that proves it |
| Notes | the page's questions, decisions and status remarks |

A page's status is one of three:

- **draft**: written, but the design still has open questions.
- **specified**: decided in a record in `design/decisions/`. The page is the spec the code is built to.
- **proved**: the code on `main` does what the page says, and a named check proves it.

A page's status is its least-proved part's. The Status section breaks it down, part by part.

## How it stays true

Docs drift when nothing checks them. `check.mjs` reads every page and refuses it when:

- **a quote has drifted.** A fence is anchored on a name, not a line number: `file=<path> name=<declaration>` (a function,
  const, class, interface or type; also `default`, `imports`, `file`, a test's `describe` title, or `name=a,b` for
  everything from `a` to `b`). The quote must be that declaration, or a run of its lines, line for line. Change the
  code, and the page that quotes it fails until `node docs/canon/check.mjs --fix` (`nx run canon:fix`) rewrites it
  from the source; a quote that no longer resembles anything in the declaration is reported, for a person to redo.
  `--fix` keeps the quote true to the code, not the prose around it: read its diff against the paragraph above each
  quote it rewrote. A part of a declaration must be one place in it: a run that occurs twice (a lone `});`) fails.
  `lines=a-b` after the name is only a hint for readers, which `--fix` keeps fresh. A file that isn't code (JSON, SQL,
  markdown) has no names, so its fence says `lines=a-b` and is compared with those lines. `quotes.mjs` holds the
  resolver and `quotes.test.mjs` its test (`nx run canon:test`).
- **a refusal is misquoted.** A refusal quoted in `design/portal.md` as `<Name> <CODE> exit <n>` must agree with the
  generated `refusals` tables in `examples/*/generated/**/errors.ts`. A name found in no table is counted, not failed, so
  the check bites once the example that declares it is on the branch. Codes and exits are copied from there, never by hand.
- **a reference is broken.** Every inline `path:line` must open and have that line. A short one, like
  `service.ts:46`, must match a full path given elsewhere on the page.
- **a component points at nothing.** A `<Scenario>` names a journey file that exists and a step in it. A
  `<Note kind="decision">` names a record in `design/decisions/`. Every `slice` is in `design/milestones.md`.
- **designed code isn't labelled.** A fence that quotes nothing must say `planned=<slice>`, so a reader always knows
  what runs today and what doesn't.
- **a word is owned twice**, a page is missing from the outline, or a retired word or old name appears.

It runs in CI beside the docs check. It doesn't yet check that a quote is the right quote, or that the prose is true:
that is the 🔍 reviewer's job, against the code.

## How pages will be partly generated from the model

Some of each page is the model's, not ours. The compiled model already knows every thing's fields, every operation's
payload, errors and steps, and every store's kind and binding. Copying that into a page would make it drift. So:

- **`<Model>` is rendered, not written.** `<Model project="examples/plugged-in" thing="handle" show="fields" />` is filled
  from `ortho check`'s model when the site builds. Add a field to the blueprint and the page shows it.
- **"Where it lives" becomes partly generated.** The model knows each declaration's path and hash. The site will add
  the generated files each declaration produces, beside the hand-written references to the runtime code.
- **The reference pages are wholly generated.** Commands from the CLI's own command tree, the `Blueprint.*` API from
  its types, and the glossary from every page's `owns` and its first paragraph (`outline.md`, "Reference").
- **Status will read from verdicts.** Once per-operation verdicts land (M1), a part marked "proved" names its verdict,
  and the site shows it stale when the code changes under it.

The rest stays written by hand: the idea, how it works, the choices, what it is not, and the notes. That is what a
model can't know.
