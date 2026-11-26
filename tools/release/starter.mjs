#!/usr/bin/env node
// Slice 5 (#1063): the starter, packed into the preset when the preset is packed. Repo tooling, plain Node ESM: packages never import it.
//   node tools/release/starter.mjs pack    (the preset's `prepack`)  copies examples/starter into packages/preset/files
//   node tools/release/starter.mjs clean   (the preset's `postpack`) removes packages/preset/files again
// The copy is made when the preset is packed, never checked in (packages/preset/files/ is git-ignored), so a pack, a publish and the
// dry run all carry the starter as it is now, and leave nothing behind. What is copied is what `Starter.read` reads: the blueprint,
// the handlers, the journeys and the compiled model.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const starter = join(repoRoot, "examples/starter");
const files = join(repoRoot, "packages/preset/files");
const PARTS = ["blueprint", "src", "journeys"];
const MODEL = "generated/model/model.json";

const pack = () => {
  rmSync(files, { recursive: true, force: true });
  for (const part of PARTS) cpSync(join(starter, part), join(files, part), { recursive: true });
  mkdirSync(dirname(join(files, MODEL)), { recursive: true });
  cpSync(join(starter, MODEL), join(files, MODEL));
};

const mode = process.argv[2];
if (mode === "pack") {
  if (!existsSync(join(starter, MODEL))) { console.error(`refused: the starter's compiled model is missing: ${join(starter, MODEL)}`); process.exitCode = 1; }
  else pack();
} else if (mode === "clean") rmSync(files, { recursive: true, force: true });
else { console.error("usage: node tools/release/starter.mjs pack|clean"); process.exitCode = 2; }
