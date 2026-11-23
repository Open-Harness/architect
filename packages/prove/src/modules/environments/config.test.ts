// A world's assets block and an environment's are the same block: both come from `ServerConfig.assets`.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ServerConfig } from "#modules/server-config/service.js";
import { environmentConfig, portalOf } from "./internal/config.ts";

const base = `{ "name": "acme", "main": "main.ts", "d1_databases": [{ "binding": "DB", "database_name": "acme", "database_id": "0", "migrations_dir": "migrations" }] }`;
const assetsOf = (text: string) => (ServerConfig.parse(text) as { assets?: unknown }).assets;

describe("the portal's assets block", () => {
  it("is the same in a world's config and in staging's", () => {
    const world = assetsOf(ServerConfig.derive("/p", base, "/client"));
    expect(assetsOf(environmentConfig("/p", base, { name: "staging", revision: "r", sha256: "s", main: "/a/main.js", portal: "/client" }))).toEqual(world);
    expect(world).toEqual(ServerConfig.assets("/client"));
  });

  it("is not there when there is no client", () => {
    expect(assetsOf(environmentConfig("/p", base, { name: "staging", revision: "r", sha256: "s", main: "/a/main.js" }))).toBeUndefined();
  });

  it("binds the client only when the verified record names one: a stray portal/ folder beside a record with none binds nothing", () => {
    const stray = mkdtempSync(join(tmpdir(), "stray-portal-"));
    mkdirSync(join(stray, "portal"));
    writeFileSync(join(stray, "portal/index.html"), "<!doctype html>");
    try {
      expect(portalOf({ main: join(stray, "main.js"), portal: null })).toBeUndefined();
      expect(portalOf({ main: join(stray, "main.js"), portal: "a".repeat(64) })).toBe(join(stray, "portal"));
    } finally { rmSync(stray, { recursive: true, force: true }); }
  });
});
