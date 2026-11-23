# app

Owns the app's map (K31, K36): `Blueprint.app`, `Blueprint.page`, `Blueprint.component`, `Blueprint.layout` (`sidebar`,
`topNav`, `none`) and `Blueprint.nav.group`. `blueprint/app/app.ts` is the app, `blueprint/app/pages/<name>.ts` a page
and `blueprint/app/components/<name>.ts` a composite component, each named by its path. A page declares its route with
typed parameters, who may open it, the reads it shows, the operations it offers and its parent; a component declares
the same two lists. Nothing here says how anything looks. A page's type is `AppPage`, since `Page` is a read's page of
results. The compiler's `app` module reads these declarations into `model.app`. Test: `app.test.ts`.
