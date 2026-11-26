# How a chapter and its film are written

One guide for every chapter of the manual and every film, so eleven chapters read as one book and nine films look like
one series. The check (`check.mjs`) holds the parts of this a machine can hold. The rest is held by whoever reviews.

## The chapter

**Who reads it.** The person who directs the work and reads the blueprint. They do not have to read the code, and the
chapter never asks them to.

**Its shape.** `spine.json` gives the chapter its number, its title and the one question it answers. The file opens
with `# <title>`, a blank line, and `Film: `docs/explainer/films/<film>/`` (or `Film: none yet`). Then:

1. An opening paragraph: the situation the reader is in at this point in Plugged In's life, and the problem, in plain
   words. No definition, no preamble.
2. Sections under `##` headings of the chapter's own. A heading is a plain statement of what the section does
   ("Hand over one brief", "Same count, a different failure"), never a label ("Overview", "Usage").
3. A section says what we want in one sentence, then how, then shows what was recorded. Prose comes before every
   block, and a sentence or two after it says what to notice.
4. The last two sections are always `## When it goes wrong` and `## How this stands`.

**Its voice.** "We" for us, "you" for the reader. Short and long sentences, plain words, active verbs. A limit is said
in the same voice as a success: "Nothing in Orthograph enforces it for you yet." No tables, no lists, no bold labels,
no callout boxes, no headings below `##`: the check refuses them. What the reader does, what their agent does and what
they read are told in the order they happen, not under headings of their own.

**What it may show.** Nothing is typed that could be read. Every fenced block is a quote: `capture=<file>` (lines of a
recording in `captures/`, in order; it opens with the recording's first line unless marked `part`; a line ending ` …`
is cut there) or `file=<path> lines=a-b` (those lines of a file, exactly). Output named in a sentence, with ✔ or ✘,
must be in a recording too. Every command written for the framework's tool is held against the command line's own tree. Quote the fewest
lines that carry the point, and never cut a quote so that it means something else.

**What it never does.** It never explains a primitive: it links the canon's nearest page once, on the word, and moves
on. It never invents an agent's words, an output, a number or a file. It never says something works that was not
recorded working.

**When it goes wrong.** Three to five short paragraphs, each one real failure and what the reader does about it. Rough
edges of the product found while recording go here, plainly.

**How this stands.** One or two paragraphs: what runs today and was recorded (with the date), what is this
repository's practice and not a command, and what is missing. If a recording was staged or replayed, say how.

**The model to read first** is `chapters/05-build-until-green.md`.

## The recording

Each chapter records on `examples/plugged-in` through one file, `record/NN-<section>.sh`, sourced by `capture.sh`,
which gives it a shell function named after the tool, taking a file name and then the command's own words (it runs the command and records it), `rec`, `copy <file> <path>` (record a file as it
stands), `restore`, and for a running app `start_app`, `sign_in <person>`, `cli`, `post`, `stop`, `forget_token`. A
section starts from a clean example and leaves it clean. It changes the example only to record, never to make an
output look better. Run one section with `docs/manual/capture.sh <section>`. Never print, write or pass on a command
line a token, key or connection string.

## The film

A film is two to three minutes, five scenes, 350 to 500 words. It shows the same thing its chapter says, in the same
order, and it quotes the same recordings.

**The script** (`docs/explainer/films/<film>/script.json`) is written for the ear: short sentences, one idea each, no
symbols, numbers as words, a `say` where a word would be mispronounced (`handle.claim` is said "handle dot claim";
`ortho` at the start of a sentence is capitalised in `say`). `steps` is five one-word steps, one per scene. `about`
says in one sentence where everything on screen comes from. The first scene opens on the reader's situation. The last
scene says what goes wrong, says plainly what is practice or missing or replayed, and ends by naming the next chapter.
Never say "first" or "last" of a line of output unless it is.

**The pictures** follow the `explainer` skill and `films/manual/kit.js`: every terminal replays a recording, every
editor quotes a file, and counts are computed from recordings. Each sheet says who is acting with `Kit.who` (you, the
designer, the author, the builder, the reviewer, your agent). `Kit.stand` marks what runs today, what is practice and
what is missing. Green and red are only verdicts; a refusal is not red. Each film has one picture that carries it and
returns across sheets (the red dots, the ladder of rungs, the trace). No sheet leaves its lower third empty for more
than a few seconds.

**What to tell the owner.** Nobody has listened to a film: say so. Say what was replayed or staged, and name the word
most likely to be said wrong.
