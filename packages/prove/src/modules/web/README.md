# web

`ortho prove --through web` (ST1.25, `design/decisions/K29-ui-layer.md` section 8): the journeys' steps are made by a person in headless
Chromium through the project's generated pieces (`generated/web/`), not over HTTP. `Web.open({ root, url, model, name })` launches the browser for the
run (the scope closes it) and gives `Journeys.run` a `WebCaller`; a starting world stays over HTTP, since it is setup and not the thing proved.

For each call, a scene for its operation is bundled from the project once (`internal/scene.ts`: the operation's piece mounted on the app's host, and
nothing else), served from memory at the world's own origin, and driven (`internal/drive.ts`): a read mounts and loads; a move types each input by its
label and presses the button; an operation that needs a yes opens its dialog and presses the confirming control, which is the person's yes. The request
the page makes goes to the world with the journey's trace and, when the step names one, its request key, and the world's answer is what the step records.
The checks, the spans and the evals are the same as over HTTP, so a piece that sends something else, or throws, or never mounts, fails the step it was
meant for (a call the page never made is status 0, and says why).

Needs Chromium (`npx playwright install chromium`); without it `prove` says so and exits 2. Test: `web.test.ts` (the scene, without a browser); the done
check is `e2e/ui-layer/04`.
