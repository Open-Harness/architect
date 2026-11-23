import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { OutputId } from "../grid/types.ts";
import { ProjectEvidenceService } from "./service.ts";
import { evidenceOf } from "./testing.ts";
import type { ProjectModel, ProjectPorts } from "./types.ts";

const pluggedIn = await evidenceOf("plugged-in");

const spyPorts = (model: ProjectModel | undefined, asked: Array<string>): ProjectPorts => ({
  model: Effect.sync(() => { asked.push("model"); return model; }),
  generated: Effect.sync(() => { asked.push("generated"); return {}; }),
  portal: (route) => { asked.push(`portal ${route}`); return Effect.succeed("<html/>"); },
  cliHelp: (words) => { asked.push(`cli ${words.join(" ")}`); return Effect.succeed("help"); },
  mcpTools: Effect.sync(() => { asked.push("mcp"); return []; }),
  spans: Effect.sync(() => { asked.push("spans"); return []; }),
  prove: Effect.sync(() => { asked.push("prove"); return undefined; }),
});
const gather = (model: ProjectModel | undefined, wanted: ReadonlyArray<OutputId>) => {
  const asked: Array<string> = [];
  const evidence = Effect.runSync(ProjectEvidenceService.gather({ ports: spyPorts(model, asked), wanted: new Set(wanted) }));
  return { evidence, asked };
};

describe("gathering the project's evidence", () => {
  it("asks for the CLI, the portal and MCP only when a switched-on cell reads them (the CLI is a process per question)", () => {
    const { asked } = gather(pluggedIn.model, ["model", "docs"]);
    expect(asked).toEqual(["model", "generated", "spans", "prove"]);
  });

  it("asks the CLI the root, each thing and each operation's `<thing> <verb>`, and the portal the home, each operation and each thing", () => {
    const { evidence, asked } = gather(pluggedIn.model, ["cli", "portal", "mcp"]);
    expect(Object.keys(evidence!.cli)).toEqual(["", "handle", "link", "profile", "handle claim", "handle release", "handle resolve", "link add", "link order", "link remove", "profile get"]);
    expect(asked.filter((a) => a.startsWith("portal")).length).toBe(1 + 7 + 3);
    expect(asked).toContain("mcp");
  });

  it("has no evidence when the project has no model", () => {
    expect(gather(undefined, ["cli"]).evidence).toBeUndefined();
  });

  it("names the docs pages the evals read", () => {
    expect(ProjectEvidenceService.docsPath("link", "add")).toBe("generated/docs/link/add.md");
    expect(ProjectEvidenceService.docsPath("link")).toBe("generated/docs/link/index.md");
  });
});
