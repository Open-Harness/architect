# Run it, break it, read the trace

Film: `docs/explainer/films/read-trace/`

Everything is green. So you try the app yourself, and something looks wrong. You want to know why, and you do not
want to read the code to find out.

## Run it, and say what you saw

One command runs the app on your machine, with a local world and no cloud account.

```sh capture=dev.txt
$ ortho dev --port 4517
```

Plugged In has no screens yet, so we call it through the command line tool that was generated from its blueprint. We
claim a name, and then a second one.

```sh capture=claim-first.txt
$ plugged-in handle claim --name firstpage
hdl_44pn4j2gfh651kt4
```

```sh capture=claim-second.txt
$ plugged-in handle claim --name secondpage
[HN-002] HandleAlreadyOwned
exit 12
```

The tool printed the refusal. The last line is the status it ended with, written down by the recording. Is that a
bug? You don't have to know. "I asked for a second name and it said no" is enough to hand to your agent.

## Find the one call

We want the agent to read what happened, not to guess at it. Every answer the app gives carries the id of its
[trace](../../canon/traces.mdx), so the agent makes the same call again and keeps that id.

```sh part capture=refusal-http.txt
HTTP/1.1 422 Unprocessable Entity
x-trace-id: 6586442f3b59173fa3fa4d9a1e3b62cf
{"_tag":"HandleAlreadyOwned","code":"HN-002"}
```

Then it prints that one trace.

```sh capture=trace-refused.txt
$ ortho telemetry trace 6586442f3b59173fa3fa4d9a1e3b62cf
handle.claim  20 ms  refused HandleAlreadyOwned  move claim → claimed
  · handle.oneNamePerPerson: another instance already holds this key
  handle.claim.record  1.0 ms  step database
```

## Read it

A trace is everything one call did. The operation's line says which operation ran, how long it took, and that it was
refused, with the refusal's name. The line under it is the cause: a [rule](../../canon/invariants.mdx), by its name in
the blueprint.

What is missing matters as much. The record step ran, and there is no commit: the rule was checked after the work and
before anything was saved. A call that was answered ends differently.

```sh part capture=trace-answered.txt
profile.get  22 ms
  profile.get.commit  0.0 ms  step commit
```

## The line that gave it

So the refusal did not come from the handler at all. It came from six lines of blueprint.

```ts file=examples/plugged-in/blueprint/things/handle/invariants.ts lines=12-17
// A person holds one claimed name at a time.
export const oneNamePerPerson = Blueprint.invariant.unique(Handle.fields.owner, {
  while: [machine.states.claimed],
  refuse: HandleAlreadyOwned,
  description: "you already hold a name", // the generated sentence reads poorly here
});
```

Now the question is yours, and it is a real one. Should a person hold only one name? If yes, the app is right and the
message needs work. If no, the rule changes, and that is a later chapter.

## When it goes wrong

A refusal and a defect are different things, and a trace marks them differently. Refused means a declared answer,
with a code. A defect is the server failing, and it goes to a builder with the trace attached. We did not record a
defect for this chapter: it is marked with a ✘, as the telemetry command's own notes say
(`packages/cli/src/modules/telemetry/README.md`).

An agent will sometimes explain a refusal from the handler. Here the handler never refuses a second name: the runtime
does, from the rule. If an explanation does not name a line of the blueprint, ask for the trace.

And sometimes the trace is not there yet. The Collector writes its files a moment after the call, so wait a few
seconds. A trace recorded before the app was stopped still prints afterwards, because the command reads files.

## How this stands

Running the app, calling it and printing a trace all run today, and everything above was recorded on Plugged In. Two
parts are missing. No command signs a test person in to a local app, so the recording asked the local world's own
door for a session, as journeys do. And the generated command line tool prints a refusal's code and not its trace's
id, which is why the agent repeats the call to read the id from the answer.
