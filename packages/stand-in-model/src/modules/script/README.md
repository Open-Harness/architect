# script

What the model stand-in answers, in order, to whom, and what it has been asked. Pure: no process, no clock, no socket, so every fairness property
of GOAL17-check-harness call 1 is a unit test (`script.test.ts`).

- `Script.add` / `take`: a script is a list of turns for a `Who` (kind from the request's `model` name, about and agent from its headers). One matching request
  uses one turn. A request with no script is `no-script` (the server answers 501), never an invented reply. A turn that calls a tool the request did not
  offer is `tool-not-offered` (500) and stays unused, so `done` fails.
- `Script.chunks`: the OpenAI stream chunks Pi reads, split in two so a hold can fall between them. `"$eval"` and `"$ticket"` in a call's arguments are filled from the request.
- `Script.asked` / `unused`: what `seen` and `done` answer. The stand-in counts what it was *asked*; the Agent's own actor counts what was *committed*, and the two differ by design.
