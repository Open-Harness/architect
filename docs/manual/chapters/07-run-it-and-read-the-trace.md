# 7 · Run it, break it, read the trace

Film: `docs/explainer/films/read-trace/` · App: `examples/plugged-in`

**How it stands.** Running the app, calling it and printing a trace all run today, and every line of output was
recorded by `docs/manual/capture.sh`. Two parts are missing. No command signs a test person in to a local app: the
recording asks the local world's own door for a session, as journeys do. And the generated command line tool does not
print a trace's id: it is in the answer's `x-trace-id` header. Plugged In has no screens yet, so "the screen" here is
a terminal.

## What you do

You try it, and you say what looks wrong, in your own words. You do not have to find the cause.

```sh capture=dev.txt
$ ortho dev --port 4517
```

```sh capture=claim-first.txt
$ plugged-in handle claim --name firstpage
hdl_44pn4j2gfh651kt4
```

```sh capture=claim-second.txt
$ plugged-in handle claim --name secondpage
[HN-002] HandleAlreadyOwned
exit 12
```

"I asked for a second name and it said no" is enough to hand over.

## What your agent does

It makes the same call again and keeps the trace's id from the answer.

```sh capture=refusal-http.txt
HTTP/1.1 422 Unprocessable Entity
x-trace-id: 6586442f3b59173fa3fa4d9a1e3b62cf
{"_tag":"HandleAlreadyOwned","code":"HN-002"}
```

Then it prints that one [trace](../../canon/traces.mdx) and reads it back to you.

```sh capture=trace-refused.txt
$ ortho telemetry trace 6586442f3b59173fa3fa4d9a1e3b62cf
handle.claim  20 ms  refused HandleAlreadyOwned  move claim → claimed
  · handle.oneNamePerPerson: another instance already holds this key
  handle.claim.record  1.0 ms  step database
```

The second line names the [rule](../../canon/invariants.mdx) that refused. The rule is one declaration in the
blueprint, and that is the line that gave the refusal.

```ts file=examples/plugged-in/blueprint/things/handle/invariants.ts lines=12-17
// A person holds one claimed name at a time.
export const oneNamePerPerson = Blueprint.invariant.unique(Handle.fields.owner, {
  while: [machine.states.claimed],
  refuse: HandleAlreadyOwned,
  description: "you already hold a name", // the generated sentence reads poorly here
});
```

## What you read

- **The first line of the trace**: the operation, how long it took, and `refused` with the refusal's name. A refusal
  is the system working. A fault is marked `✘ defect` instead, and that is a bug.
- **The line under it**: which rule refused, by its name in the blueprint.
- **What is missing.** The step `handle.claim.record` ran and there is no `handle.claim.commit`: the rule was
  checked after the work and before the commit, so nothing was saved. Compare a call that was answered:

```sh capture=trace-answered.txt
profile.get  22 ms
  profile.get.commit  0.0 ms  step commit
```

- **The rule itself**, six lines of blueprint. Now the question is yours: should a person hold one name? If yes, the
  app is right and the message is what needs work. If no, the rule changes, and that is chapter 10.

## What goes wrong

- **Nobody kept the trace's id.** The command line tool shows the refusal's code and not the id. Ask the agent to
  repeat the call and read the header.
- **The trace is not there yet.** The Collector writes its files a moment after the call. Wait a few seconds.
- **The app was stopped.** `ortho telemetry trace` reads files, so a trace recorded before the stop still prints.
- **The agent explains the refusal from the handler.** The handler never refuses `HandleAlreadyOwned`: the runtime
  does, from the rule. If an explanation does not name a line of the blueprint, ask for the trace.
- **You are reading a defect as a refusal.** `refused` is a declared answer with a code. `✘ defect` is the server
  failing, and it goes to a builder with the trace attached.
