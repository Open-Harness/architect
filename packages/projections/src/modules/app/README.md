# app

The `app` projection: `generated/app/`, mounted by `blueprint/projections/app.ts` (`Blueprint.use(app)`). Pure: the model in,
files out. It writes six files, from the declared map (`model.app`) or, with none, the map derived from the things (a home, a
page per thing offering its operations, a sidebar of the things), which is worked out here and never written into the model:

- `routes.json`, `navigation.json`, `map.json` (the agent's map: each page with its effective lists and its components) and
  `palette.json` (every page, then each operation a page offers, with its page, its component and who may call it);
- `links.ts`: `links.<page>({ ...params })`, typed, so a wrong or missing parameter and an undeclared page fail `tsc`;
- `palette.ts`: `visibleTo("anonymous" | "person")`, the entries the caller may open and call.

Test: `app.test.ts`.
