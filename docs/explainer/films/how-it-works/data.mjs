// What the first film quotes: real files of examples/plugged-in, the recorded runs in captures/, and a few counted facts.
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const quoted = [
  "blueprint/things/handle/thing.ts", "blueprint/things/handle/machine.ts", "blueprint/things/handle/invariants.ts", "blueprint/things/handle/errors.ts",
  "blueprint/things/handle/verbs/claim.ts", "src/handle/claim.ts", "journeys/claim-a-handle.ts",
  "generated/api/src/handle/claim.ts", "generated/api/src/errors.ts", "generated/sdk/src/handle/claim.ts", "generated/cli/src/handle/claim.ts",
  "generated/mcp/src/index.ts", "generated/docs/handle/claim.md", "generated/server/main.ts",
];

export default ({ repo, home, read, walk }) => {
  const app = join(repo, "examples/plugged-in"), files = (dir) => walk(join(app, dir)).map((f) => relative(app, f)).sort();
  const model = JSON.parse(read(join(app, "generated/model/model.json")));
  return {
    src: Object.fromEntries(quoted.map((f) => [f, read(join(app, f))])),
    cap: Object.fromEntries(readdirSync(join(home, "captures")).map((f) => [f.replace(/\.(txt|diff)$/, ""), read(join(home, "captures", f))])),
    facts: {
      blueprintFiles: files("blueprint").length, generatedFiles: files("generated").length, modelBytes: statSync(join(app, "generated/model/model.json")).size,
      handleFiles: files("blueprint/things/handle"), generatedFolders: readdirSync(join(app, "generated")).sort(),
      operations: Object.keys(model.operations), things: Object.keys(model.things), claim: model.operations["handle.claim"], refusals: model.refusals,
    },
  };
};
