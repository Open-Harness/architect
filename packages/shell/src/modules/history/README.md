# history

The address bar as a value: `path()`, `push(to)` and `subscribe(listener)` over the History API and `popstate`, so back and forward
work and the rest of the shell never touches `window`. `History.browser(window)` is the only constructor; the shell's entry
(`main.ts`) passes the real one, and the tests pass the small fake in `internal/fake.ts`. A push of the address already shown is
ignored, so a click on the current page's link adds no entry.
