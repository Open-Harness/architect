// What an operation's handler is given and where it starts: its type in `generated/server/handlers/`, the scaffold in the
// project's `src/` for an operation the project writes (it explains itself, K16), and the journey stubs a thing's machine,
// roles and errors yield (`ortho add journeys`).
export { callImports, callSteps, handlerTypeAt, renderHandlerTypes, wired } from "./internal/calls.ts";
export { renderHandlerScaffold } from "./internal/scaffold.ts";
export { machinePaths } from "./internal/paths.ts";
export { renderJourneyStubs } from "./internal/stubs.ts";
// The sentence the docs page shares with the scaffold's front matter (K16 a): who may call an operation.
export { who } from "./internal/words.ts";
