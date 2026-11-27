// Builds a film's reading page: node tools/supplement.mjs <film>  ->  out/<film>/supplement.html
// films/<film>/supplement/ holds head.html, body.html and script.html. In body.html, <!--file:path--> is replaced by that
// file under the film's app/ folder, and <!--file:path#from-to--> by those lines of it, so the page quotes the same text the film does.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
const film = process.argv[2], here = resolve(import.meta.dirname, ".."), home = join(here, "films", film), out = join(here, "out", film);
const read = (p) => readFileSync(p, "utf8"), esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// A quoted file loses its imports, so a reader sees the declaration and nothing else.
const own = (text) => { const rows = text.replace(/\n$/, "").split("\n"); let last = -1; rows.forEach((l, k) => { if (l.startsWith("import ")) last = k; }); let at = last + 1; while (rows[at] === "") at++; return rows.slice(at); };
const body = read(join(home, "supplement/body.html")).replace(/<!--file:([^#>]+?)(?:#(\d+)-(\d+))?-->/g, (_, path, a, b) => {
  const text = read(join(home, "app", path)); return esc((a ? text.replace(/\n$/, "").split("\n").slice(a - 1, b) : own(text)).join("\n"));
});
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "supplement.html"), read(join(home, "supplement/head.html")) + body + "\n" + read(join(home, "supplement/script.html")));
console.log("built " + join(out, "supplement.html"));
