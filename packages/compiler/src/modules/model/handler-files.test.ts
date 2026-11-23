import { expect, it } from "vitest";
import { handlerFiles } from "./internal/handler-files.ts";

const app = { kind: "operation", thing: "allowance", verb: "spend", runs: "server", from: { kind: "app" } } as const;
const mounted = { ...app, thing: "wallet", verb: "send", from: { kind: "feature", mount: "wallet", package: "@acme/wallet", version: "1.0.0", thing: "wallet" } } as const;

it("the app's own operation is src/<thing>/<verb>.ts in the project", () => {
  expect(handlerFiles(app).map((h) => h.file)).toEqual(["src/allowance/spend.ts"]);
});

it("a read has no handler", () => {
  expect(handlerFiles({ ...app, kind: "read" })).toEqual([]);
});

it("a plugin's server operation is in its package; a client operation has an entry per host", () => {
  expect(handlerFiles(mounted).map((h) => h.file)).toEqual(["@acme/wallet/src/wallet/send.js"]);
  expect(handlerFiles({ ...mounted, runs: "client" }).map((h) => [h.host, h.module])).toEqual([
    ["node", "src/wallet/send.node.js"], ["browser", "src/wallet/send.browser.js"], ["world", "src/wallet/send.world.js"],
  ]);
});
