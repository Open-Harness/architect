// Whether an environment runs, found again from what it left on disk.
import { Names } from "orthograph/server";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { EnvironmentFailed, type Status } from "../types.ts";
import { telemetryDir } from "./collector.ts";
import { ServerConfig } from "#modules/server-config/service.js";
import { files, groupAlive, isWrangler, readPid, readPort } from "./process.ts";

export const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const failed = (message: string) => new EnvironmentFailed({ message });
export const io = <A>(what: string, run: () => A) => Effect.try({ try: run, catch: (e) => failed(`${what}: ${String(e).replace(/^Error: /, "")}`) });

export const dirOf = (root: string, name: string) => join(resolve(root), Names.folder, "environments", name);

export const status = (root: string, name: string): Effect.Effect<Status, EnvironmentFailed> =>
  Effect.gen(function* () {
    if (!NAME.test(name)) return yield* failed(`"${name}" isn't an environment name`);
    const dir = dirOf(root, name);
    const pid = readPid(dir);
    if (pid === undefined || !(yield* groupAlive(pid)) || !isWrangler(pid, dir)) return { state: "down" as const, name };
    const port = readPort(dir);
    if (port === undefined) return { state: "down" as const, name };
    const record = files(dir).bundle;
    const bundle = existsSync(record) ? yield* io("its bundle record", () => JSON.parse(readFileSync(record, "utf8")) as { revision: string; sha256: string }) : {};
    const telemetry = telemetryDir(dir);
    // Its own collector's address is in its config's vars: where prove can send the journey's span.
    const config = existsSync(files(dir).config) ? (ServerConfig.parse(readFileSync(files(dir).config, "utf8")) as { vars?: { OTLP_URL?: string } }) : {};
    const collector = config.vars?.OTLP_URL;
    return { state: "up" as const, name, url: `http://127.0.0.1:${port}`, port, pid, ...bundle, ...(existsSync(telemetry) ? { telemetry } : {}), ...(collector ? { collector } : {}) };
  });
