// Renders each screen to a static HTML file in out/ (no script in the page), linking web.css, theme.css and mock.css.
// Run from screens/ with tools/build.sh.
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { MapScreen } from "./map.tsx";
import { AgentDrawer } from "./agent.tsx";

const page = (title: string, body: string) => `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="web.css"><link rel="stylesheet" href="theme.css"><link rel="stylesheet" href="mock.css">
</head><body>${body}</body></html>
`;

mkdirSync("out", { recursive: true });
copyFileSync("src/mock.css", "out/mock.css");
const screens: [string, string, string][] = [
  ["map-derived", "Plugged In map, derived", renderToStaticMarkup(<MapScreen mode="derived" selected="handle" />)],
  ["map-declared", "Plugged In map, declared sketch", renderToStaticMarkup(<MapScreen mode="declared" selected="edit" />)],
  ["agent-view", "The agent's view", renderToStaticMarkup(<MapScreen mode="derived" selected="handle" drawer={<AgentDrawer />} />)],
];
for (const [file, title, html] of screens) writeFileSync(`out/${file}.html`, page(title, html));
console.log(screens.map(([f]) => f).join(" "));
