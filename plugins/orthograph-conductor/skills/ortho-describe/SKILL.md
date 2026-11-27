---
name: ortho-describe
description: The conductor's describe stage for an Orthograph app. Turns the agreed plan page into a blueprint, filling only what the plan answers and leaving every undecided thing as a blank the check lists. Use it when the conductor's state says the stage is describe.
---

# Describe it

The plan page has to become something the framework can check, and the parts the owner has not decided must not be
decided for them on the way.

**Who does it:** you, the conductor, as the designer (touches the plan, the blueprint and the journey stubs), or one
designer worker for a large plan. The owner answers the blanks.

**Done when:** the blueprint declares every thing and operation the plan names; `ortho check` lists no blank the plan
already answers, and every blank it lists is logged as an open question for the owner; `ortho generate` has run, so
the check shows `drift ✔`.

## How

1. **Declare what the plan names.** Never write the blueprint from an empty file: ask the framework for each thing and
   each operation by name, and it writes the frame.

   ```sh
   $ ortho add thing wallet
   wrote blueprint/things/wallet/thing.ts
   wrote blueprint/things/wallet/machine.ts
   wrote blueprint/things/wallet/roles.ts
   wrote blueprint/things/wallet/events.ts
   wrote blueprint/things/wallet/errors.ts
   wrote blueprint/things/wallet/invariants.ts
   wrote blueprint/values/wallet.ts
   $ ortho add operation wallet.open
   wrote blueprint/things/wallet/verbs/open.ts
   ```

   None of these holds a decision. Where one goes, the frame has a blank that says in words what is missing:

   ```ts
   export default Blueprint.operation(Wallet, {
     description: Blueprint.todo("what open does to a wallet, in one sentence"),
     payload: Blueprint.todo("what a caller sends"),
     answer: Blueprint.todo("what open answers"),
     allowed: Blueprint.todo("who may open"),
   });
   ```

2. **Run `ortho check`.** It prints every blank with its file and line, and counts them:

   ```sh
   $ ortho check
   wallet has 7 blanks
     blueprint/things/wallet/machine.ts:6  the states a wallet can be in, the first one where it starts
     blueprint/things/wallet/thing.ts:4  what a wallet is, in one sentence
     blueprint/things/wallet/verbs/open.ts:8  who may open
     ...
   ```

   Log it (`check.ran`, with what it printed). `ortho model` counts them by thing and operation, more briefly:

   ```sh
   unfinished wallet  3 blanks
   unfinished wallet.open  4 blanks
   ```

3. **Fill only what the plan already says**, in the plan's words. For the wallet the page said "a handle's money, one
   per claimed handle" and named four states, so exactly two blanks are filled:

   ```ts
     description: "A handle's money, one for each claimed handle.",
   ```
   ```ts
     states: ["opening", "open", "frozen", "closed"],   // the first is where a wallet starts
     moves: {},
   ```

   Leave every other blank. Each one left is a question: log it as `open` for the owner and ask them one at a time,
   with your recommendation. Fill each answer, and run the check again. The count should go down only when the owner
   decides something.

4. **Fill a thing's states, then run `ortho generate`.** It writes what it can for the blueprint as it stands: the
   unfinished thing gets its types, its docs and its table; an unfinished operation is left out, and no handler is
   written for it. Run `ortho check` again; with blanks left it ends like this, and that is right:

   ```sh
   wallet has 5 blanks
     ...
   types ✔
   rules ✔
   drift ✔
   ratchets 0
   check ✘
   ```

5. When the owner has answered what the first operation needs, log the checks and `stage.done`, and enter done.

If filling a blank shows the plan was wrong or missing something, log `stage.reopened` for `plan` with `from:
"describe"`, and take it to the owner as one question.

## What goes wrong

- **Generating before a thing's states are filled** writes types that do not compile, and the check then fails with
  `types ✘ 1` and `TS1110: Type expected.` Fill the states, generate again.
- **The blueprint changed and nothing was generated**: the check reports `drift ✘` with "run ortho generate". Run it.
- **A blank filled that the plan does not answer.** The check cannot tell a decision from a guess; a blank that is gone
  is simply gone. Whenever the count drops, say which line of the plan each answer came from.
- **`check ✘` means broken or only unfinished**, and it says the same for both. Read the lines above it: blanks alone
  are unfinished; `types ✘`, `rules ✘` or `drift ✘` is broken.
- **Not everything undecided is a blank.** The frame leaves a thing's moves empty and its rules in an empty file, and
  the check counts neither. The plan's "what must stay true" is not in the blueprint until you write it: track those
  rules yourself, as open items, until they are written.
