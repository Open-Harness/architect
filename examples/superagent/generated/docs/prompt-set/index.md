<!-- Generated from the blueprint. Do not edit. -->
# prompt-set

What a team writes into its agents' prompts: sections, skills and overrides. One current version, every save kept.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | id |
| revision | uint |
| sections | schema |
| skills | schema |
| overrides | schema |

## Operations

- [prompt-set.compose](compose.md): Make the prompt for one agent's model request, from the current version.
- [prompt-set.history](history.md): Every saved version, newest first, each row its number, when, by whom, and the one it was made from.
- [prompt-set.preview](preview.md): Show the prompt an agent of one kind would get, with a draft applied.
- [prompt-set.save](save.md): Save a new version of the prompts. A save made from an older version is refused, with the current one.
