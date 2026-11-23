import { Effect } from "effect";
import { cliCommands, docsPath } from "./internal/paths.ts";
import type { ProjectEvidence, ProjectEvidenceApi } from "./types.ts";

export const ProjectEvidenceService: ProjectEvidenceApi = {
  docsPath,
  cliCommands,
  gather: ({ ports, wanted }) =>
    Effect.gen(function* () {
      const model = yield* ports.model;
      if (model === undefined) return undefined;
      const files = yield* ports.generated;
      const routes = ["/portal", ...Object.keys(model.operations).map((op) => `/portal/operations/${op}`), ...Object.keys(model.things).map((t) => `/portal/things/${t}`)];
      const portal = wanted.has("portal") ? yield* Effect.all(routes.map((r) => ports.portal(r).pipe(Effect.map((html) => [r, html] as const)))) : [];
      const cli = wanted.has("cli") ? yield* Effect.all(cliCommands(model).map((c) => ports.cliHelp(c === "" ? [] : c.split(" ")).pipe(Effect.map((help) => [c, help] as const))), { concurrency: 4 }) : [];
      const mcp = wanted.has("mcp") ? yield* ports.mcpTools : undefined;
      const spans = yield* ports.spans;
      const prove = yield* ports.prove;
      return { model, files, portal: Object.fromEntries(portal), cli: Object.fromEntries(cli), mcp, spans, prove } satisfies ProjectEvidence;
    }),
};
