# compare

Two models side by side. `Compare.models` lists each value, thing and operation that was added, removed or changed,
with the parts of its entry that changed. `Compare.dependsOn` names what an operation's proof rests on (itself, its
thing, the things its fields refer to) with their hashes, so `prove` can key its evidence by them and `impact` can
tell which proofs went stale; a plugin's operation also rests on its mount (`feature:<mount>`), and an operation that calls
an adapter on that mount (`adapter:<mount>`, with an `adapter:<mount> -> <operation>  used-by` edge). Pure: models in, values out.

`Compare.release(before, after)` turns the differences into a version (D3 #1): an added operation or read is minor; a changed
payload, answer or error set, or a removed operation, is major; anything else (a budget, the docs) is a patch; the largest
wins, and no difference at all is still a patch, because a rebuilt revision may not reuse a version. It returns each change as
a line of `changes.json` (`{ kind, what, detail, bump }`). `Compare.next(last, bump)` gives the version after `last`, `1.0.0` with
none. Models are compared as canonical text, since one that has been through the logbook has its keys sorted.
