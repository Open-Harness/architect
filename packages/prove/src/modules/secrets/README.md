# secrets

What `ortho secrets` and `ortho promote` know about the secrets a blueprint declares (M2.04,
`design/decisions/M2-04-secrets-readings.md`). The model names them (`model.secrets`); this module says which have a value in
an environment, and sets one.

- Values live in `.ortho/environments/<env>/secrets.env`, mode 0600, gitignored, in the local pass for every environment.
  `rows` and `missing` return names and state, never a value.
- `set` keeps the value as given (the CLI strips the one final newline), in 0600 from before it is written, and leaves every
  other line. It refuses an unknown environment or name, a release or builder secret, an empty value, and a value of more than one line.
- `missing` is what `promote` refuses on: a stored runtime secret with no value in the target. A declared `test` value does not count.

Test: `secrets.test.ts`; the CLI's end to end is `e2e/m2/03` and `04`.
