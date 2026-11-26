// Puts one film together: node tools/build.mjs <film>. The narration's times, the film's sources and its scenes become
// one page: out/<film>/film.html (a whole page, for the renderer and for looking at locally), out/<film>/page.html (the
// same film as an artifact's body) and out/<film>/captions.srt. Nothing a scene shows is typed into a scene: each film's
// data.mjs reads it from files.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

const film = process.argv[2] ?? "how-it-works";
const here = resolve(import.meta.dirname, ".."), repo = resolve(here, "../.."), home = join(here, "films", film), out = join(here, "out", film);
const read = (p) => readFileSync(p, "utf8");
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const filesUnder = (dir) => Object.fromEntries(walk(dir).sort().map((f) => [relative(dir, f), read(f)]));

const script = JSON.parse(read(join(home, "script.json")));
const meta = { title: script.title, source: script.source, steps: script.steps };
const load = (await import(pathToFileURL(join(home, "data.mjs")).href)).default;
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
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "captions.srt"), captions.map((c, k) => `${k + 1}\n${stamp(c.t0)} --> ${stamp(Math.max(c.t1, c.t0 + 0.4))}\n${c.text}\n`).join("\n"));

const data = { meta, timing, captions, ...load({ repo, home, read, walk, filesUnder }) };
// A script may name scene files it shares with another film (`"uses": ["../capxul-lite/kit.js"]`); they are read first.
const scenes = [...(script.uses ?? []).map((p) => read(join(home, p))), ...readdirSync(join(home, "scenes")).filter((f) => f.endsWith(".js")).sort().map((f) => read(join(home, "scenes", f)))];
const inline = (js) => js.replace(/<\/script/g, "<\\/script");
const head = `<title>${meta.title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap">
<style>\n${read(join(here, "src/film.css"))}</style>`;
const body = `${read(join(here, "src/shell.html"))}
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script>window.FILM_DATA = ${JSON.stringify(data).replace(/</g, "\\u003c")};</script>
<script>\n${inline([read(join(here, "src/engine.js")), ...scenes, read(join(here, "src/player.js"))].join("\n"))}</script>`;

writeFileSync(join(out, "page.html"), `${head}\n${body}\n`);
writeFileSync(join(out, "film.html"), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n<style>html,body{margin:0}</style></head>\n<body>\n${body}\n</body></html>\n`);
console.log(`built ${film}: ${scenes.length} scenes, ${timing.total}s, page ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB`);
