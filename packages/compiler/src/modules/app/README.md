# app

Reads the app's map (K31, K36) into `model.app`. `setAside` takes `blueprint/app/` out of the files before the rest is laid
out, so the existing layout reader never sees it; `describe` runs after the model is described and resolves each page,
component and navigation group by identity (the name is the file's), works out each page's effective `shows` and `offers`
(its own, then its components'), and hashes every entry like things and operations. `model.app` is present only when the
blueprint has an `app/` folder, so a blueprint with none generates what it always did.

Five refusals, each a problem `<file>: [<tag>] <words>` naming the file and, in the words, every other file involved:
`app-route-param`, `app-offer-uncallable`, `app-undeclared-page`, `app-parent-cycle`, `app-duplicate-route`,
`app-named-twice`. A page's parent may be a thunk (`() => page`) so a parent that is also its child's can be written; the
compiler refuses the cycle. Test: `app.test.ts`.
