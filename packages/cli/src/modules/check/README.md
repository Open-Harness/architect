# check

`ortho check`: what must hold before a project is proven, in five parts, each printed with ✔ or ✘ and every
finding named by file, line and rule.

- **blanks**: every `Blueprint.todo` in `blueprint/` and in a `journeys` folder at the project's root (journeys are read
  from both, `ADD-journey-places`), grouped by its thing. Any blank fails.
- **types**: tsc on the project (`internal/tools.ts`).
- **rules**: oxlint with only the ortho rules from `@orthograph/lint`, given the project's facts from its model
  (declared names, errors, which handler belongs to which operation). Files are passed one by one, so a project kept
  inside an ignored folder is still linted.
- **drift**: `generated/` must be exactly what the blueprint renders. A differing, missing or extra file is the rule
  `no-edited-output`.
- **ratchets**: `.ortho/ratchets.json` maps a rule to the findings it still allows. Counts only go down; a ratchet
  above its findings asks to be lowered.

`run` reads the project and runs tsc and oxlint; it writes only `.ortho/check/`. `main.ts` prints and sets the
exit code.
