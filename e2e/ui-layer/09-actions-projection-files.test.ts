// Check 09 (M1.22): what the actions projection writes, as files. One module per operation, in `generated/actions/<thing>/<verb>.ts`, of
// Plugged In and of acme: nothing missing, nothing extra, each module headed as generated, exporting `options` and nothing else, calling no
// `defineAction`, importing nothing of agent-native, and holding none of the code the language's rules keep out of generated files.
// Written before the projection exists, by an author who builds none of it. Every expected name comes from the model (`generated/model/model.json`).
//
// Red today because `generated/actions/` does not exist: each test names the first operation it cannot find.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXAMPLES, actionFile, codeOf, exampleRoot, loadModule, modelAt, opsOf, specifiers, verbFile, walk } from "./projection.ts";
import { shapeProblems } from "./shape.ts";

/** The bare specifiers a generated action may import: the front door, its actions module and Effect. A relative path is the project's own. */
const BARE = ["orthograph", "orthograph/actions", "effect"];

for (const example of EXAMPLES) {
  const root = exampleRoot(example);
  const ops = opsOf(modelAt(root));

  describe(`09 M1.22: the actions of ${example}`, () => {
    it("the model has operations to judge, and Plugged In has the seven of K29", () => {
      expect(ops.length).toBeGreaterThan(6);
      if (example === "plugged-in") expect(ops.map((op) => op.name)).toEqual(["handle.claim", "handle.release", "handle.resolve", "link.add", "link.order", "link.remove", "profile.get"]);
    });

    it("every operation has its module, generated/actions/<thing>/<verb>.ts, and no module is left over", () => {
      const want = ops.map((op) => actionFile(op)).sort();
      const have = walk(root, "generated/actions");
      expect(have, "every file of generated/actions/: one module per operation and no other file").toEqual(want);
    });

    it("each module opens with the generated line naming its operation's blueprint file", () => {
      const wrong = ops.flatMap((op) => {
        const path = join(root, actionFile(op));
        if (!existsSync(path)) return [`${op.name}: ${actionFile(op)} is missing`];
        const source = readFileSync(path, "utf8");
        const first = source.split("\n")[0];
        const problems: Array<string> = [];
        if (first !== `// Generated from ${op.file}. Do not edit.`) problems.push(`its first line is ${JSON.stringify(first)}, not the generated line for ${op.file}`);
        return problems.map((p) => `${op.name}: ${p}`);
      });
      expect(wrong).toEqual([]);
    });

    it("each module exports `options`, a function, and nothing else at run time: it never calls defineAction, so nothing is registered by importing it", async () => {
      const wrong: Array<string> = [];
      for (const op of ops) {
        if (!existsSync(join(root, actionFile(op)))) { wrong.push(`${op.name}: ${actionFile(op)} is missing`); continue; }
        const { exported, options } = await loadModule(root, op);
        if (exported.join(",") !== "options") wrong.push(`${op.name} exports [${exported.join(", ")}], not [options]`);
        if (typeof options !== "function") wrong.push(`${op.name}: options is not a function`);
      }
      expect(wrong).toEqual([]);
    });

    it("no module has a defineAction, an agent-native import, retrySafe, or an import beyond orthograph, orthograph/actions, effect and the project's own files", () => {
      const wrong = ops.flatMap((op) => {
        const path = join(root, actionFile(op));
        if (!existsSync(path)) return [`${op.name}: ${actionFile(op)} is missing`];
        const source = readFileSync(path, "utf8");
        const code = codeOf(source);
        const problems: Array<string> = [];
        if (/\bdefineAction\b/.test(code)) problems.push("names defineAction (the host wraps the options, K29 section 3.1)");
        if (/\bretrySafe\b/.test(code)) problems.push("names retrySafe (a Worker 500 may have committed: spikes/agent-native-compat finding 5)");
        for (const spec of specifiers(source)) {
          if (/agent-native/.test(spec)) problems.push(`imports ${spec}`);
          else if (!spec.startsWith(".") && !BARE.includes(spec)) problems.push(`imports ${spec}, beyond ${BARE.join(", ")} and the project's own files`);
        }
        return problems.map((p) => `${op.name}: ${p}`);
      });
      expect(wrong).toEqual([]);
    });

    it("each module is the shape K29 section 3.1 draws, as syntax: only imports, types and `export const options`; literal flags, name and description; run one `host.call` of this operation's own SDK call with { payload: args } and ctx, and nothing around it", () => {
      const wrong = ops.flatMap((op) => {
        const path = join(root, actionFile(op));
        if (!existsSync(path)) return [`${op.name}: ${actionFile(op)} is missing`];
        return shapeProblems(readFileSync(path, "utf8"), { thing: op.thing, verb: verbFile(op) }).map((p) => `${op.name}: ${p}`);
      });
      expect(wrong).toEqual([]);
    });

    it("no module holds what the rules keep out of generated code: async, await, try, throw, Date, setTimeout, fetch, process, or a run of an Effect", () => {
      const banned = /\b(async|await|try|throw|setTimeout|fetch|process)\b|\bnew Date\b|\bDate\.now\b|\bEffect\.(?:run\w*|sleep)\b/;
      const wrong = ops.flatMap((op) => {
        const path = join(root, actionFile(op));
        if (!existsSync(path)) return [`${op.name}: ${actionFile(op)} is missing`];
        const found = banned.exec(codeOf(readFileSync(path, "utf8")));
        return found === null ? [] : [`${op.name}: ${found[0]}`];
      });
      expect(wrong).toEqual([]);
    });
  });
}
