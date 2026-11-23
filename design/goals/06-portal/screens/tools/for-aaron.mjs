// Writes for-aaron.html: the three screens (PNGs inline, dark and light) and the grill, in one file with no external script or style.
//   node tools/for-aaron.mjs <kit>     (kit has `marked` installed; run from design/goals/06-portal/screens/)
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const kit = resolve(process.argv[2]);
const { marked } = createRequire(`${kit}/package.json`)("marked");
const b64 = (f) => readFileSync(`out/${f}`).toString("base64");
const figure = (name, caption) =>
  `<figure><img class="dark" alt="${caption}" src="data:image/png;base64,${b64(name + "-dark.png")}"><img class="light" alt="${caption}" src="data:image/png;base64,${b64(name + "-light.png")}"><figcaption>${caption}</figcaption></figure>`;

const captions = {
  "map-derived": "The app's map as Plugged In has it today: derived, not declared (the projection's real output).",
  "map-declared": "The same screen once Plugged In declares K31's map and K36's link list (a sketch, marked).",
  "agent-view": "The agent's view: a drawer from the top bar (option C).",
};
let md = readFileSync("grill.md", "utf8");
md = md.replace(/^See `out\/([a-z-]+)-dark\.png`\.?/gm, (_, n) => `Shown at the top (${n}).`);
let html = marked.parse(md);

const css = `
:root{--bg:#fff;--fg:#1a1a1f;--muted:#5a5a66;--border:#d9d9e0;--code:#f1f1f5;--primary:#2f5fd0}
:root[data-theme=dark]{--bg:#0f0f12;--fg:#f3f3f6;--muted:#a3a3b0;--border:#2d2d36;--code:#1a1a20;--primary:#6b97ff}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0f0f12;--fg:#f3f3f6;--muted:#a3a3b0;--border:#2d2d36;--code:#1a1a20;--primary:#6b97ff}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 "Plus Jakarta Sans",system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:32px 16px 96px}
h1{font-size:1.9rem;line-height:1.2}h2{font-size:1.4rem;margin-top:3rem;border-top:1px solid var(--border);padding-top:1.5rem}h3{font-size:1.1rem}
code,pre{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.85em;background:var(--code);border-radius:6px}
code{padding:1px 5px}pre{padding:12px 14px;overflow-x:auto}pre code{padding:0;background:none}
table{border-collapse:collapse;width:100%;margin:1rem 0;display:block;overflow-x:auto}th,td{border:1px solid var(--border);padding:6px 10px;text-align:left;vertical-align:top;font-size:.9rem}
th{background:var(--code)}
figure{margin:1.5rem 0}figure img{width:100%;height:auto;border:1px solid var(--border);border-radius:10px}figcaption{color:var(--muted);font-size:.85rem;margin-top:6px}
.light{display:block}.dark{display:none}
:root[data-theme=dark] .light{display:none}:root[data-theme=dark] .dark{display:block}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .light{display:none}:root:not([data-theme=light]) .dark{display:block}}
button{position:fixed;top:12px;right:16px;background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer}
@media(max-width:600px){main{padding:24px 16px 64px}}
`;
const intro = `<p><strong>For Aaron.</strong> Two screens the old portal lacks, drawn on UI SDK, the Orthograph theme and the shell, with Plugged In as the subject. Four questions follow; each starts in plain words. Screens are shown in the colour scheme you are in; the button switches.</p>
${figure("map-derived", captions["map-derived"])}
${figure("map-declared", captions["map-declared"])}
${figure("agent-view", captions["agent-view"])}`;

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portal screens grill</title><style>${css}</style></head><body><button id="t" type="button">Dark / light</button><main>${intro}${html}</main><script>document.getElementById("t").onclick=function(){var r=document.documentElement,d=r.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");r.setAttribute("data-theme",d==="dark"?"light":"dark")}</script></body></html>`;
writeFileSync("for-aaron.html", page);
console.log(page.length);
