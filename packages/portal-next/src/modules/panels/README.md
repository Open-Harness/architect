# panels

The frame as data: what each of the rail's five icons opens, and the one index ⌘K searches. The panels are the groups of the app's own
navigation (`generated/app/navigation.json`, declared in `blueprint/app/app.ts`), so a page added to a group appears in its panel with no
edit here. A map page is one entry at its generated path; `thing` and `environment`, which take a name, become one entry per thing and per
declared environment, at the typed link `generated/app/links.ts` gives. The search index reads the model (things, operations, journeys,
refusal codes, environments) and never a trace. Pure. Test: `panels.test.ts`.
