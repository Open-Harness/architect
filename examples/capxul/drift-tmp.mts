import { Effect } from "effect";
import { writeFileSync } from "node:fs";
import { Render } from "@orthograph/generators/render";
import { Compiler } from "@orthograph/compiler";
const root = process.cwd();
const model = await Effect.runPromise((Compiler as any).compile(root));
const files = await Effect.runPromise(Render.files({ name: "capxul", model, root } as any));
writeFileSync("/tmp/c2.md", files.find((f: any) => f.path === "generated/docs/goal/create.md").content);
