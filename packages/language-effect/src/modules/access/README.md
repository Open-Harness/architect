# access

`Access.check`: an operation's `allowed`, checked before its handler runs. Any entry that allows is enough:
`anyone`; `signedIn` (a person principal); `role.of(path)`, which walks the path from the payload (following each
field back to the id it was taken from, loading each instance through `Records`) and applies the role's rule to the
instance it lands on. Otherwise `NotAllowed` (exit 3), and the handler never runs. A bare role, with no path, never
allows until roles proper arrive (L1.22). On a read by id, whose payload is `{ id }`, a path
walks from the subject, and a first key that is none of the subject's fields names the subject's own thing: on
`membership.get`, `owner.of("membership.organization")` and `owner.of("organization")` are the same walk (#761). A field
named like the thing wins: on a `Folder` with a `folder` field, `folder.organization` walks the parent. Only a read by id
skips the key. On an operation, a first key that is neither a payload field nor a field of the subject still admits nobody, and a list starts from its
`where` field (`owner.of("organization")`). Until #767 makes `ortho check` refuse a first key that is neither, a typo
there on a read by id is taken as the thing's name.
