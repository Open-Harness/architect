// generated/sdk: a typed client. One function per operation; refusals arrive as their own classes.
import { Names } from "orthograph/server";
import type { Model, OperationModel } from "@orthograph/compiler";
import { GENERATED, camel, exportedAs, lines, local, onDevice, pascal, toRoot } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";
import { sdkTypes } from "./types.ts";
import { clientSource } from "./client.ts";

/** `.create`, or `["sign-in"]` for a name that isn't an identifier. */
const member = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? `.${name}` : `[${JSON.stringify(name)}]`);

/** The plugin's entry for the host that imports this, found by the SDK's own `imports` (`generated/sdk/package.json`). */
const hostEntry = (o: OperationModel) => `#host/${o.name}`;

const server = (o: OperationModel, client: string): RenderedFile => ({
  path: `generated/sdk/src/${o.thing}/${o.verb}.ts`,
  scaffold: false,
  content: lines(
    GENERATED,
    `import { Effect } from "effect";`,
    `import type { PayloadOf } from "${Names.frontDoor}";`,
    `import { declaration } from "../../../api/src/${o.thing}/${o.verb}.ts";`,
    `import { ${client}, call, type CallOptions } from "../client.ts";`,
    "",
    `/** ${o.description} */`,
    `export const ${local(camel(o.verb))} = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>`,
    `  call(declaration, payload, options, ${o.idempotent === "request"}, Effect.flatMap(${client}, (client) => client${member(o.thing)}${member(o.verb)}({ payload })));`,
    exportedAs(o.verb),
  ),
});

/**
 * An operation that runs on the device: the plugin's own handler, run in this process under the app's mount, its spans
 * sent from here. No request is made. Which handler is the host's: `browser` for a browser, `node` for Node.
 */
const device = (model: Model, o: OperationModel, client: string): RenderedFile => {
  const path = `generated/sdk/src/${o.thing}/${o.verb}.ts`;
  const mount = o.from.kind === "app" ? undefined : model.mounts?.[o.from.mount];
  return {
    path,
    scaffold: false,
    content: lines(
      GENERATED,
      `import { Effect } from "effect";`,
      `import { Device, Mount } from "${Names.pkg("language-effect")}/device";`,
      `import type { PayloadOf } from "${Names.frontDoor}";`,
      `import { declaration } from "../../../api/src/${o.thing}/${o.verb}.ts";`,
      `import handler from "${hostEntry(o)}";`,
      mount ? `import mount from "${toRoot(path)}${mount.file}";` : [],
      `import { ${client}Spans } from "../client.ts";`,
      "",
      `const device = Device.serve({ name: "${o.name}", operation: declaration, handler: ${mount ? "Mount.serving(mount, handler)" : "handler"} });`,
      "",
      `/** ${o.description} Runs here, on this device: nothing is sent to the server. */`,
      `export const ${local(camel(o.verb))} = (payload: PayloadOf<typeof declaration>) =>`,
      `  Effect.flatMap(${client}Spans, (where) => device.run(payload, where));`,
      exportedAs(o.verb),
    ),
  };
};

/**
 * `generated/sdk/package.json`: for each device operation, the plugin's entry for the host that imports it. A browser
 * (or a bundler building for one) gets the `.browser.js` entry, Node the `.node.js`; the `world` entry is never picked by
 * a condition, only named by the journey runner. With no condition matched, the browser entry, which imports nothing of Node's.
 */
const sdkPackage = (ops: ReadonlyArray<OperationModel>): RenderedFile => {
  const entry = (o: OperationModel, host: string) => (o.from.kind === "app" ? "" : `${o.from.package}/src/${o.from.thing}/${o.verb}.${host}.js`);
  return {
    path: "generated/sdk/package.json",
    scaffold: false,
    content: JSON.stringify({
      "//": GENERATED,
      type: "module",
      imports: Object.fromEntries(ops.map((o) => [hostEntry(o), { browser: entry(o, "browser"), node: entry(o, "node"), default: entry(o, "browser") }])),
    }, null, 2) + "\n",
  };
};

const clientFile = (name: string, client: string, hasDevice: boolean): RenderedFile => ({
  path: "generated/sdk/src/client.ts",
  scaffold: false,
  content: clientSource(name, client, hasDevice),
});

export const renderSdk = (model: Model, name: string): ReadonlyArray<RenderedFile> => {
  const ops = Object.values(model.operations);
  const things = [...new Set(ops.map((o) => o.thing))];
  // The client's class is named for the project; a thing, a state or an event of that name keeps its own, and the client is `<Name>Client`.
  const named = Object.values(model.things).flatMap((t) => [t.identifier, `${t.identifier}State`, ...Object.keys(t.events)]);
  const client = named.includes(pascal(name)) ? `${pascal(name)}Client` : pascal(name);
  const devices = ops.filter((o) => onDevice(o) && o.from.kind !== "app");
  const perOp = ops.map((o) => (devices.includes(o) ? device(model, o, client) : server(o, client)));
  const types = sdkTypes(model);
  const index: RenderedFile = {
    path: "generated/sdk/src/index.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      `export { ${client}, layer, Credential, InvalidPayload } from "./client.ts";`,
      `export type { CallOptions } from "./client.ts";`,
      `export { Errors } from "../../api/src/index.ts";`,
      things.map((t) => `export * as ${camel(t)} from "./${t}/index.ts";`),
      types.exports,
    ),
  };
  const thingIndexes = things.map((t): RenderedFile => ({
    path: `generated/sdk/src/${t}/index.ts`,
    scaffold: false,
    content: lines(GENERATED, ops.filter((o) => o.thing === t).map((o) => `export { ${camel(o.verb)} } from "./${o.verb}.ts";`)),
  }));
  return [clientFile(name, client, devices.length > 0), index, ...types.files, ...thingIndexes, ...perOp, ...(devices.length > 0 ? [sdkPackage(devices)] : [])];
};
