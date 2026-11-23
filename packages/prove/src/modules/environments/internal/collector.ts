// An environment that hosts worlds has a collector of its own: a process that lives and dies with the environment,
// so what a world's journeys did is on disk beside the environment, and a prove that is killed leaves nothing behind.
import { join } from "node:path";

/** Where the collector writes, under the environment's folder. */
export const telemetryDir = (dir: string) => join(dir, "telemetry");
