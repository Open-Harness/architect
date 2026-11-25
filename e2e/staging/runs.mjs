// The staging runs the workflow can take (`.github/workflows/staging.yml`, the dispatch's `app` input): each is a root and the journeys its story step proves, by name
// (`design/decisions/CX-staging.md`). Written by the checks author; a builder never edits it (tools/ci/builder-paths.sh). `runs.test.mjs` holds each list to the journey files.
//
//   node e2e/staging/runs.mjs select <app> <journeys-file>
//     Prints `ROOT=<root>` (the workflow appends it to $GITHUB_ENV, so every later step has it as $ROOT) and writes the run's journeys to <journeys-file>, one name per line, each line ended. An app that is not
//     here, or a run with no journeys, exits 2 and writes nothing: an empty `--only` list would prove every journey, which is not the run anyone chose.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Plugged In's one-sentence story: the run the workflow takes by default, exactly as it did before it took a run at all. */
export const STORY = "a person claims a page and shares it";

/**
 * Capxul's finish line (Goal 16's done check, `design/goals/16-capxul.md`): the journeys of the books, HR and payroll, and of KYC, KYB and a bank account through Bridge. Each part lists its
 * journeys by their own names, as `Blueprint.journey("<name>", …)` gives them in `examples/capxul/journeys/`. A part with no journeys in `main` yet is an empty list, named here so it is not
 * forgotten: the checks author adds its journeys when they land in `main` (CX-staging, section 2).
 */
export const CAPXUL = {
  books: [],
  hr: [
    "set up a company",
    "companies are kept apart",
    "set up branches",
    "branch names are the company's",
    "set up departments and job titles",
    "another company's department is refused",
    "another company's job title is refused",
    "set up grades",
    "grade names are the company's",
    "set up employment types",
    "hire an employee",
    "move an employee through the company",
    "promote an employee",
    "transfer an employee",
    "an employee leaves",
    "run a separation",
    "set up a holiday list",
    "a one-day list",
    "add holidays",
    "every weekday",
    "weekly offs",
    "set up shift types",
    "mark attendance",
    "request attendance",
    "approve an attendance request",
    "reject an attendance request",
    "attendance stays in its company",
    "set up expense types",
    "claim expenses",
    "reject an expense claim",
    "expense claims stay in their company",
    "open a job",
    "set up interview rounds",
    "schedule an interview",
    "give interview feedback",
    "make a job offer",
    "hire from a job opening",
  ],
  payroll: [],
  "kyc-kyb": [
    "bridge: a person is checked",
    "bridge: a kyc keeps what bridge gave",
    "bridge: an approved kyc keeps what bridge gave",
    "bridge: two kycs are each their own",
    "bridge: start a kyb",
    "bridge: kyb is decided by bridge",
    "bridge: a rejected kyb keeps what bridge gave",
  ],
  "bank-account": [
    "bridge: open a bank account",
    "bridge: a bank account, end to end",
    "bridge: a deposit lands",
    "bridge: send money out",
    "bridge: a transfer is paid or returned",
    "bridge: a bank account closes",
    "bridge: a reopened account is its own",
    "bridge: each company's money is its own",
  ],
};
/** The parts of the finish line, in the brief's order. */
export const PARTS = ["books", "hr", "payroll", "kyc-kyb", "bank-account"];
/** The parts that have no journeys in `main` yet. Every other part must list at least one. */
export const PENDING = ["books", "payroll"];

/** The runs, by the name the dispatch's `app` input chooses. The first is the default. */
export const RUNS = {
  "plugged-in": { root: "examples/plugged-in", journeys: [STORY] },
  capxul: { root: "examples/capxul", journeys: PARTS.flatMap((part) => CAPXUL[part]) },
};

/**
 * The journeys a project declares, by name, read from its journey files (`<root>/journeys/*.ts`, each `export default Blueprint.journey("<name>", …)`). A file whose name cannot be read is
 * named in `unread`, never skipped: a journey the check cannot see is not a journey it can say is there.
 */
export const journeysIn = (root) => {
  const dir = join(root, "journeys");
  const names = new Map(), unread = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts")).sort()) {
    const found = [...readFileSync(join(dir, file), "utf8").matchAll(/\bBlueprint\.journey\(\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
    if (found.length !== 1) { unread.push(`journeys/${file} declares ${found.length} journeys by a name this check can read, not one`); continue; }
    if (names.has(found[0])) unread.push(`journeys/${file} and ${names.get(found[0])} are both named ${JSON.stringify(found[0])}`);
    else names.set(found[0], `journeys/${file}`);
  }
  return { names, unread };
};

/** Everything wrong with a run's list against the project at `root`: a name no journey file declares (renamed or removed), a name listed twice, an empty list, or a journey file that cannot be read. */
export const listProblems = (journeys, root) => {
  const { names, unread } = journeysIn(root);
  const out = [...unread];
  if (journeys.length === 0) out.push("the list is empty: an empty --only list proves every journey");
  for (const name of journeys) if (!names.has(name)) out.push(`no journey in ${root}/journeys is named ${JSON.stringify(name)}: renamed or removed, and the run would not prove it`);
  for (const name of new Set(journeys.filter((x, i) => journeys.indexOf(x) !== i))) out.push(`${JSON.stringify(name)} is listed twice`);
  return out;
};

/** What `select` does, as data: the root and the file's text, or why it cannot. */
export const select = (app) => {
  const run = Object.hasOwn(RUNS, app) ? RUNS[app] : undefined;
  if (run === undefined) return { problem: `no staging run named ${JSON.stringify(app)}: one of ${Object.keys(RUNS).join(", ")}` };
  if (run.journeys.length === 0) return { problem: `the ${app} run lists no journeys` };
  return { root: run.root, text: run.journeys.map((name) => `${name}\n`).join("") };
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [verb, app, file] = process.argv.slice(2);
  if (verb !== "select" || app === undefined || file === undefined) {
    console.error("usage: node e2e/staging/runs.mjs select <app> <journeys-file>");
    process.exit(2);
  }
  const chosen = select(app);
  if (chosen.problem !== undefined) {
    console.error(chosen.problem);
    process.exit(2);
  }
  writeFileSync(file, chosen.text);
  console.log(`ROOT=${chosen.root}`);
}
