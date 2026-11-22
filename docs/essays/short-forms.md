# Orthograph, in short

Three lengths of the same description, for a bio line, a page's opening paragraph and a spoken introduction. Each
one stays inside what is built today, so it can be used without a footnote.

## One line

> Orthograph is a framework where the plan compiles: you declare the system, it generates everything mechanical,
> and journeys judge the rest.

Two alternates, for different rooms:

- **For people who use coding agents:** "Plan mode you can compile, generate from and prove."
- **For people who don't:** "Write down what your app is, and Orthograph builds the server, the clients and the
  docs, and checks the part you wrote by hand."

## One paragraph

Coding agents now plan and write code well, but the plan they work from is still prose: read again in every
session, checked by nothing, and out of date the day the code changes. Orthograph makes the plan a typed blueprint
instead: the things an app keeps, the operations that change them, who may call each one, how each can fail, the
rules that must always hold, and the journeys that prove it works. A compiler turns the blueprint into one model,
and generators make everything mechanical from it: the server, the HTTP API, the SDK, the command line tool, the MCP
tools, the docs and a portal. The only code anyone writes by hand is behaviour, one handler per operation, inside a
frame that won't compile if it breaks the contract. Then `ortho prove` runs the journeys against the real system
and returns a verdict, so an agent can work, read the verdict and fix, until everything is green. When the plan
turns out wrong, you change the blueprint, and Orthograph names exactly what the change made stale.

## Thirty seconds, spoken

About eighty-five words, written for the ear.

> Agents can write code now. What they can't do is keep a week of work true to the plan, because the plan is a
> chat or a markdown file that nothing checks.
>
> Orthograph makes the plan real code. You declare what your app keeps, what it does, who's allowed, and the
> stories that prove it works. Orthograph generates the server, the clients and the docs from that. The agent
> writes only the behaviour, and a verdict tells it when it's done.

---

The one line improves on "a framework for building and deploying software" by saying what is different about it.
Every framework builds and deploys software; this one makes the plan the thing that compiles.
