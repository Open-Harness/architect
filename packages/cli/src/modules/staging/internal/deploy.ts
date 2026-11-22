// `up`: writes the run's input, has Alchemy deploy the generated stack (the databases and their migrations, the Worker, its namespaces and its secret), and waits until the address answers.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { StagingFailed, type Credentials, type Plan, type Tools } from "../types.ts";
import { parseServer, stackInput } from "./config.ts";
import { stagingUrl } from "./plan.ts";
import { alchemy, clip, inputPath, stackPath } from "./stack.ts";

const io = <A>(what: string, work: () => A) => Effect.try({ try: work, catch: () => new StagingFailed({ message: `could not ${what}` }) });

/** A first deploy of a new Worker fails about half the time after it has uploaded (code 10007, spike snag 11); a second, 20 seconds later, succeeded every time. */
const RETRIES = 2;
const RETRY_AFTER = 20_000;
/** A new Worker is not reachable the moment the deploy returns (snag 10): three good answers in a row, two seconds apart, at most thirty tries. */
const GOOD = 3;
const TRIES = 30;
const BETWEEN = 2_000;

export const up = (tools: Tools, credentials: Credentials, root: string, plan: Plan) =>
  Effect.gen(function* () {
    const account = tools.account(credentials);

    // Everything that can be refused is refused before anything is made.
    const subdomain = yield* account.subdomain;
    if (!existsSync(stackPath(root))) {
      return yield* new StagingFailed({ message: "generated/infra/alchemy.run.ts is missing: mount the infra projection (blueprint/projections/infra.ts) and run `ortho generate`" });
    }
    const serverPath = join(root, "generated/server/wrangler.jsonc");
    const server = yield* io("read generated/server/wrangler.jsonc: run `ortho generate`", () => readFileSync(serverPath, "utf8")).pipe(Effect.flatMap(parseServer));
    const built = yield* tools.build(root);
    const input = yield* stackInput({ server, plan, built });
    const file = inputPath(root, plan.prefix);
    yield* io("write the stack's input", () => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, input); });

    const secret = tools.secret();
    for (let attempt = 1; ; attempt++) {
      const done = yield* alchemy(tools, credentials, root, plan.prefix, "deploy", secret);
      if (done.status === 0) break;
      const failed = new StagingFailed({ message: `the deploy failed: ${clip(done.output, credentials, [secret])}` });
      if (attempt >= RETRIES || !done.output.includes("10007")) return yield* failed;
      yield* tools.pause(RETRY_AFTER);
    }

    const url = stagingUrl(plan.prefix, subdomain);
    let good = 0;
    for (let tried = 0; tried < TRIES && good < GOOD; tried++) {
      if (tried > 0) yield* tools.pause(BETWEEN);
      good = (yield* tools.probe(`${url}/_ortho/bundle`)) === 200 ? good + 1 : 0;
    }
    if (good < GOOD) return yield* new StagingFailed({ message: `the Worker at ${url} did not answer ${GOOD} times running; \`ortho env destroy staging --run ${plan.run}\` removes it` });
    return url;
  });
