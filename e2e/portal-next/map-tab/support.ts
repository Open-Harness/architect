// What the Map tab's checks share (Goal 6, slice 7; MAP-screens Q1 to Q3): a copy of Plugged In made as a user makes one (the fixture folders laid
// over it, `ortho generate` run), its generated files read for what the page must show, and the new client opened on the blueprint that
// generate wrote for the portal. Nothing a check expects is typed here: every name, route, role and operation comes out of `generated/`.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Wire, type BlueprintWire } from "@orthograph/portal";
import { chromium, type Browser, type Page } from "playwright";
import { CLIENTS, ServedPortals } from "../../served-portal/service.ts";
import type { ServedPortal } from "../../served-portal/types.ts";
import { generated, project, repo, type Project } from "../map/support.ts";

/** One page of `generated/app/map.json`, as the projection writes it. */
export interface MapPage {
  readonly name: string;
  readonly path: string;
  readonly description: string;
  readonly parent?: string;
  readonly allowed: ReadonlyArray<{ readonly kind: string; readonly role?: string }>;
  readonly shows: ReadonlyArray<string>;
  readonly offers: ReadonlyArray<string>;
  readonly components: ReadonlyArray<{ readonly name: string; readonly description: string; readonly shows: ReadonlyArray<string>; readonly offers: ReadonlyArray<string> }>;
}
export interface MapGroup { readonly title: string; readonly folded: boolean; readonly pages: ReadonlyArray<{ readonly page: string }> }
export interface MapJson { readonly layout: string; readonly home: string; readonly pages: ReadonlyArray<MapPage>; readonly groups: ReadonlyArray<MapGroup> }

/** An app the portal is opened on: the project's own generated files, and what the page must show of them. */
export interface App {
  readonly project: Project;
  readonly map: MapJson;
  /** Did the app declare its map (`blueprint/app/`)? Read from the model `generate` wrote: a declared map is `model.app`, a derived one never is. */
  readonly declared: boolean;
  readonly things: ReadonlyArray<string>;
  /** `generated/portal/blueprint.json`: what the portal reads, as `ortho generate` wrote it. */
  readonly blueprint: unknown;
}

/** Plugged In with `names` (fixture folders of `e2e/portal-next/fixtures/`) laid over it and the app projection mounted, generated. */
export const appOf = (names: ReadonlyArray<string>): App => {
  const p = generated(project([...names, "mount"]));
  const model = p.json<{ things: Record<string, unknown>; app?: unknown }>("generated/model/model.json");
  return { project: p, map: p.json<MapJson>("generated/app/map.json"), declared: model.app !== undefined, things: Object.keys(model.things).sort(), blueprint: p.json("generated/portal/blueprint.json") };
};

/** The new client, built from the checked-in source (nx caches it, so this is quick when nothing changed). A check never reads a stale client. */
export const buildClient = (): void => {
  const env: NodeJS.ProcessEnv = { ...process.env, NX_DAEMON: "false" };
  delete env["HEROUI_AUTH_TOKEN"];
  const built = spawnSync(join(repo, "node_modules/.bin/nx"), ["run", "portal-next:build", "--outputStyle=static"], { cwd: repo, env, encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
  if (built.status !== 0 || !existsSync(join(CLIENTS.next, "index.html"))) throw new Error(`packages/portal-next did not build (exit ${String(built.status)}):\n${`${built.stdout}${built.stderr}`.split("\n").slice(-25).join("\n")}`);
};

export interface Opened {
  /** The app's own page, `/portal`, in a fresh tab of a real Chromium, ready (the page said so). */
  readonly home: () => Promise<Page>;
  readonly close: () => Promise<void>;
}

/** Serve the app's blueprint exactly as `ortho generate` wrote it (the data API from `@orthograph/portal/server`, the new client as static files). */
export const openApp = async (app: App): Promise<Opened> => {
  const wire = await Effect.runPromise(Wire.decode(app.blueprint)) as BlueprintWire;
  const served: ServedPortal = await ServedPortals.open({ context: { blueprint: wire, reader: null, bundleRevision: null }, clientDir: CLIENTS.next });
  const browser: Browser = await chromium.launch({ headless: true });
  return {
    home: async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", colorScheme: "light", locale: "en-US", timezoneId: "UTC" });
      const page = await context.newPage();
      await page.goto(`${served.url}/portal`, { waitUntil: "load" });
      await page.waitForSelector('[data-portal="page"][data-ready="true"]', { state: "attached", timeout: 30_000 });
      return page;
    },
    close: async () => { await browser.close().catch(() => undefined); await served.close().catch(() => undefined); },
  };
};
