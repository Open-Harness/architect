// Rewrites src/modules/adapter/internal/runtime-sources.ts from internal/runtime/*.ts: `node packages/generators/scripts/embed-runtime.ts`.
import { readFileSync, writeFileSync } from "node:fs";
import { embeddedText, RUNTIME_NAMES } from "../src/modules/adapter/internal/embed.ts";

const folder = new URL("../src/modules/adapter/internal/", import.meta.url);
const sources = Object.fromEntries(RUNTIME_NAMES.map((name) => [name, readFileSync(new URL(`runtime/${name}.ts`, folder), "utf8")])) as Record<(typeof RUNTIME_NAMES)[number], string>;
writeFileSync(new URL("runtime-sources.ts", folder), embeddedText(sources));
