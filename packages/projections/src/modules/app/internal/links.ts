// `links.ts`: a typed link per page. `links.profile({ handle })` is the page's address with each parameter percent-encoded; a page
// that is not declared, a parameter that is wrong or one that is missing fails `tsc` where it is written.
import type { MapView } from "../types.ts";

const GENERATED = "// Generated from the blueprint. Do not edit.";
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const PARAM = /:([A-Za-z_][A-Za-z0-9_]*)/g;

/** The address as a string expression: its fixed parts as strings, each parameter encoded. */
const expression = (path: string): string => {
  const parts = path.split(PARAM);
  // `split` with a capture alternates the fixed text and the parameter's name.
  return parts.map((part, i) => (i % 2 === 1 ? `encodeURIComponent(params.${part})` : JSON.stringify(part))).filter((p) => p !== '""').join(" + ") || '""';
};

export const linksModule = (view: MapView): string => [
  GENERATED,
  "",
  "/** The address of each page of the app, by the page's name. */",
  "export const links = {",
  ...view.pages.map((p) => {
    const key = IDENTIFIER.test(p.name) ? p.name : JSON.stringify(p.name);
    const params = p.params.length === 0 ? "" : `params: { ${p.params.map((n) => `readonly ${n}: string`).join("; ")} }`;
    return `  ${key}: (${params}): string => ${expression(p.path)},`;
  }),
  "} as const;",
  "",
].join("\n");
