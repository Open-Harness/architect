import { Reading } from "../../reading/service.ts";
import { filesNaming, over } from "./over.ts";

/** step.model: the step is in the model with its full name (`<operation>.<step>`) and its kind. */
export const model = over("step.model", ({ op, step }) => [
  ...(step.name.startsWith(`${op.name}.`) ? [] : [`its name ${step.name} does not start with its operation ${op.name}.`]),
  ...(step.type === "" || step.type === undefined ? ["it has no kind"] : []),
]);

/** step.server: prove's `steps` check of the operation passes, and the step ran in a span of its own named for it. */
export const server = over("step.server", ({ op, step }, e) => [
  ...Reading.proved(e.prove, `${op.name} steps`),
  ...(e.spans === undefined ? ["no spans were read from the prove run"] : Reading.spansNamed(e.spans, step.name).length > 0 ? [] : [`no span named ${step.name}: the step did not run in a span of its own`]),
]);

/** step.docs: the operation's page lists the step as `name` (kind). */
export const docs = over("step.docs", ({ op, step }, e) => {
  const path = `generated/docs/${op.thing}/${op.verb}.md`;
  const page = e.files[path];
  if (page === undefined) return [`${path} was not generated`];
  const steps = Reading.mdSection(page, "Steps");
  if (steps === undefined) return [`${path} has no Steps section`];
  return Reading.mdBullets(steps).includes(`${step.name} (${step.type})`) ? [] : [`${path}'s Steps does not list \`${step.name}\` (${step.type})`];
});

/** step.portal: the operation's page lists the step with its kind, in the portal's own part (the embedded docs prove nothing). */
export const portal = over("step.portal", ({ op, step }, e) => {
  const route = `/portal/operations/${op.name}`;
  const page = e.portal[route];
  if (page === undefined) return [`${route} could not be rendered`];
  const steps = Reading.htmlSection(Reading.portalOwn(page), 3, "Steps");
  if (steps === undefined) return [`${route} has no Steps list`];
  return Reading.htmlItems(steps).includes(`${step.name} (${step.type})`) ? [] : [`${route}'s Steps does not list ${step.name} (${step.type})`];
});

/** step.telemetry: the step is a span named for it, carrying `step.kind` as the model has it. */
export const telemetry = over("step.telemetry", ({ step }, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const spans = Reading.spansNamed(e.spans, step.name);
  if (spans.length === 0) return [`no span named ${step.name}`];
  return spans.filter((s) => s.attrs["step.kind"] !== step.type).slice(0, 1).map((s) => `a ${step.name} span has step.kind ${String(s.attrs["step.kind"] ?? "none")}, the model says ${step.type}`);
});

/** step.api (absence): nothing in the API package names the step: not an endpoint, not a step list. */
export const api = over("step.api", ({ step }, e) => filesNaming(e, "api", step.name).map((path) => `${path} names ${step.name}: the caller's contract must not carry a step`));
/** step.sdk (absence): the SDK's types and doc comments name no step. */
export const sdk = over("step.sdk", ({ step }, e) => filesNaming(e, "sdk", step.name).map((path) => `${path} names ${step.name}`));

/** step.cli (absence): no command, help text or output names the step. */
export const cli = over("step.cli", ({ step }, e) => [
  ...filesNaming(e, "cli", step.name).map((path) => `${path} names ${step.name}`),
  ...Object.entries(e.cli).filter(([, help]) => help?.includes(step.name) === true).map(([command]) => `\`${command} --help\` names ${step.name}`),
  ...(Object.values(e.cli).every((help) => help === undefined) ? ["the generated CLI's --help could not be run, so its text was not read"] : []),
]);

/** step.mcp (absence): no tool's name, description or schema names the step. */
export const mcp = over("step.mcp", ({ step }, e) => [
  ...filesNaming(e, "mcp", step.name).map((path) => `${path} names ${step.name}`),
  ...(e.mcp === undefined ? ["the MCP server's tools/list could not be read"] : e.mcp.filter((tool) => JSON.stringify(tool).includes(step.name)).map((tool) => `the tool ${tool.name} names ${step.name}`)),
]);
