# access

`Access.check`: an operation's `allowed`, checked before its handler runs. Any entry that allows is enough:
`anyone`; `signedIn` (a person principal); `role.of(path)`, which walks the path from the payload (following each
field back to the id it was taken from, loading each instance through `Records`) and applies the role's rule to the
instance it lands on. Otherwise `NotAllowed` (exit 3), and the handler never runs. A bare role, with no path, never
allows until roles proper arrive (L1.22). When the path's first key is no payload field (a read, whose payload is `{ id }`),
it walks from the subject, and a first key that is none of the subject's fields names the subject's own thing: on
`membership.get`, `owner.of("membership.organization")` and `owner.of("organization")` are the same walk (#761).
