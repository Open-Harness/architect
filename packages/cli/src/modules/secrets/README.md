# secrets

`ortho secrets [--env <name>]` lists every secret the blueprint declares (the app's `blueprint/secrets.ts` and each mounted
plugin's), one row each: the derived NAME, how it is given (`generated` or `stored`), whose it is (`runtime`, `release`,
`builder`) and its state (`set`, `missing`, `in CI`). `--env` defaults to `local`.

`ortho secrets set <NAME> [--env <name>]` reads the value from **stdin only** (a value on the command line, as an argument
or a flag, is refused: `ps` and shell history would see it), keeps it as given less the one final newline, and writes it to
`.ortho/environments/<env>/secrets.env` at mode 0600. It prints `set NAME in <env>`, never a value, and refuses an empty
value, an unknown name (listing every declared one) or environment.

The module returns what it has to say; `main.ts` reads stdin and prints. The state lives in `@orthograph/prove`'s `secrets`
module, which `promote` also reads. Decisions: `design/decisions/M2-04-secrets-readings.md`. Test: `secrets.test.ts`.
