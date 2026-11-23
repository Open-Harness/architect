// Renders page components to static HTML and wraps each as a design-canvas .dc.html file.
// Usage: bun render.tsx <outDir> [Name ...]
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync } from "node:fs";
import { pages } from "./pages.tsx";

const [outDir, ...names] = process.argv.slice(2);
const css = ["tokens.css", "console.css", "rules.css"].map((f) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8")).join("\n");
for (const name of names.length ? names : Object.keys(pages)) {
  const page = pages[name];
  const body = renderToStaticMarkup(page.el());
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${page.title} · ${page.app ?? "Pi Durable Console"}</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="/_blob/3d919fd818506a14aa401243b3e69241">
<link rel="stylesheet" href="/_blob/f30f6291464f81bf7dfbe0a4c38de8f0">
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap">
<style>
${css}
</style>
</helmet>
<div class="dark console-root" data-theme="dark">
${body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1440,"height":${page.height}}}'>
class Component extends DCLogic {}
</script>
</body>
</html>
`;
  writeFileSync(`${outDir}/${name}.dc.html`, html);
  console.log(`${name}: ${html.length} bytes`);
}
