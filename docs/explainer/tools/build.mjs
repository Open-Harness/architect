// Puts the film together: the narration's times, the example's real files and the recorded runs become one page.
// Writes out/film.html (a whole page, for the renderer and for looking at locally) and out/page.html (the same film as
// an artifact's body). Nothing a scene shows is typed into a scene: it is read here, from the repository.
import { readFileSync, readdirSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const here = resolve(import.meta.dirname, ".."), repo = resolve(here, "../.."), app = join(repo, "examples/plugged-in"), out = join(here, "out");
const read = (p) => readFileSync(p, "utf8");
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

const quoted = [
  "blueprint/things/handle/thing.ts", "blueprint/things/handle/machine.ts", "blueprint/things/handle/invariants.ts", "blueprint/things/handle/errors.ts",
  "blueprint/things/handle/verbs/claim.ts", "src/handle/claim.ts", "journeys/claim-a-handle.ts",
  "generated/api/src/handle/claim.ts", "generated/api/src/errors.ts", "generated/sdk/src/handle/claim.ts", "generated/cli/src/handle/claim.ts",
  "generated/mcp/src/index.ts", "generated/docs/handle/claim.md", "generated/server/main.ts",
];
const src = Object.fromEntries(quoted.map((f) => [f, read(join(app, f))]));
const cap = Object.fromEntries(readdirSync(join(here, "captures")).map((f) => [f.replace(/\.(txt|diff)$/, ""), read(join(here, "captures", f))]));
const model = JSON.parse(read(join(app, "generated/model/model.json")));
const files = (dir) => walk(join(app, dir)).map((f) => relative(app, f)).sort();
const facts = {
  blueprintFiles: files("blueprint").length, generatedFiles: files("generated").length, modelBytes: statSync(join(app, "generated/model/model.json")).size,
  handleFiles: files("blueprint/things/handle"), generatedFolders: readdirSync(join(app, "generated")).sort(),
  operations: Object.keys(model.operations), things: Object.keys(model.things), claim: model.operations["handle.claim"], refusals: model.refusals,
};
const timing = JSON.parse(read(join(out, "timing.json")));
// Captions: a line's sentences, each timed by the word that ends it (or by its share of the line, when that word wasn't heard).
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const captions = timing.scenes.flatMap((s) => s.lines.flatMap((l) => {
  const parts = l.text.match(/[^.?!:]+[.?!:]+|[^.?!:]+$/g).map((p) => p.trim()).filter(Boolean), chars = l.text.length;
  let at = l.start, used = 0, w = 0;
  return parts.map((text, k) => {
    used += text.length + 1; const count = text.split(/\s+/).length, lastWord = norm(text.split(/\s+/).pop());
    let end = l.start + Math.min(1, used / chars) * (l.end - l.start);
    for (let i = Math.max(w, w + count - 3); i < Math.min(l.words.length, w + count + 3); i++) if (norm(l.words[i].w) === lastWord) { end = l.words[i].t1; w = i + 1; break; }
    if (k === parts.length - 1) end = l.end;
    const cue = { t0: +at.toFixed(3), t1: +end.toFixed(3), text }; at = end; return cue;
  });
}));
const stamp = (t) => { const ms = Math.round(t * 1000), p = (v, n = 2) => String(v).padStart(n, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
writeFileSync(join(out, "captions.srt"), captions.map((c, k) => `${k + 1}\n${stamp(c.t0)} --> ${stamp(Math.max(c.t1, c.t0 + 0.4))}\n${c.text}\n`).join("\n"));
const data = { timing, captions, src, cap, facts };

const scenes = readdirSync(join(here, "src/scenes")).filter((f) => f.endsWith(".js")).sort().map((f) => read(join(here, "src/scenes", f)));
const inline = (js) => js.replace(/<\/script/g, "<\\/script");
const head = `<title>How Orthograph Works</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap">
<style>\n${read(join(here, "src/film.css"))}</style>`;
const body = `${read(join(here, "src/shell.html"))}
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script>window.FILM_DATA = ${JSON.stringify(data).replace(/</g, "\\u003c")};</script>
<script>\n${inline([read(join(here, "src/engine.js")), ...scenes, read(join(here, "src/player.js"))].join("\n"))}</script>`;

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "page.html"), `${head}\n${body}\n`);
writeFileSync(join(out, "film.html"), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n<style>html,body{margin:0}</style></head>\n<body>\n${body}\n</body></html>\n`);
console.log(`built: ${scenes.length} scenes, ${data.timing.total}s, page ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB`);
