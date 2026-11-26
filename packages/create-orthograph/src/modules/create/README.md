# create

`run({ args, parent })` is all `create-orthograph` does: the one name in the arguments, then `App.create` from
`@orthograph/preset`, so it makes exactly what `ortho new app` makes and refuses what it refuses. It returns lines; the
entry, `src/main.ts`, prints them and sets the exit code.
