// Journey-author file: the US payroll tax importer's checks (slice 1, design/goals/16-lane-payroll-tax.md;
// design/decisions/CX-tax-us-rows.md). Offline: the importer runs on the committed fixtures in ./fixtures/, never on
// the network. Builders never edit this file (tools/ci/builder-paths.sh).
//
// The contract these checks name, in `plugins/payroll-tax-us/tools/import/run.ts`, imported as
// `@capxul/payroll-tax-us/tools/import/run.ts` through the package's `./tools/*` export (main.ts, the entry, calls it):
//
//   importRows(options: {
//     firstSource: { root, repository, commit },   // an open-withholding checkout: its data/us/<state>/<year>/*.yaml
//     secondSource: { root, repository, commit },  // a us-payroll-tax-tables checkout: its data/tax/<year>/*.json
//     settled: ReadonlyArray<Settled>,              // ../settled.ts's shape
//     out: string,                                  // the data/ folder to write
//   }): Effect<ImportReport, ImportStopped, FileSystem | Path>
//
//   verifyManifest(dir: string): Effect<void, ManifestMismatch, FileSystem | Path>
//
// What it writes into `out`:
// - one file per jurisdiction and year, `<year>/<jurisdiction, lower case>.ts` (`2026/us.ts`, `2026/us-il.ts`), whose
//   first line is `// Generated from open-withholding data/us/<state>/<year>/ at <commit>. Do not edit.`, with the
//   upstream folder's own year, and whose only other statement is `export const rows = …`, ordered by tax and then
//   effectiveFrom: no import, no other export. Each row is a TaxRow (below): the upstream file's figures as its
//   decimal strings, never numbers, its brackets in from/to form, and the rest of its params as they are. It reads
//   only the YAML directly in each <year>/ folder: `locals/` (city and county taxes) stays out (CX-payroll-tax point 6);
//   and it stamps the repository and commit it is given, never constants of its own;
// - `manifest.json`: { firstSource: { repository, commit }, secondSource: { repository, commit }, upstream: { <upstream
//   path>: sha256 }, generated: { <path under out>: sha256 } }, every sha256 of the file's bytes, in hex.
//
// How it judges the second source: it compares every figure the two sources share, the brackets' from, rate and base
// among them, in every window in force on or after the second source's year, pairing each window by its date and each
// filing status by what it means (Georgia's married_joint is the second source's married_jointly_sole_earner, page 51
// of its September 2026 guide, Table E). A figure that differs stops it
// with Disagreement, naming both sides, unless a settled entry `covers` that pointer with open-withholding's figure
// there as it is now. Every settled entry's hash is checked, used or not: a changed hash stops it with SettledChanged,
// a pointer in `figures` that resolves to nothing with SettledUnresolved (a pointer to null resolves). A settled entry
// covers only its own file's pointers, and only the exact pointer. It checks the settled list before it compares, and
// it writes nothing when it stops: `out` is not made.
// ImportReport is { rows, settled }: the rows written, and the ids of the entries that covered a disagreement, sorted.
import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { afterEach, describe, expect, it } from "vitest";
import { importRows, verifyManifest } from "@capxul/payroll-tax-us/tools/import/run.ts";
import { FIRST_SOURCE, SECOND_SOURCE, type Settled } from "./settled.ts";
import { settledFixture } from "./fixtures/settled.ts";

interface Bracket { readonly from: string; readonly to: string | null; readonly rate: string; readonly base: string }
interface TaxRow {
  readonly jurisdiction: string;
  readonly tax: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly method: string;
  readonly rounding: Readonly<Record<string, string>>;
  /** params.brackets, keyed by its path below brackets ("all", "single", "standard.married_joint"). */
  readonly brackets: Readonly<Record<string, ReadonlyArray<Bracket>>>;
  /** params without brackets, as upstream has them. */
  readonly parameters: Readonly<Record<string, unknown>>;
  /** Upstream's `source`, or each of schema 0.2's `sources`, in order. */
  readonly citations: ReadonlyArray<{ readonly document: string; readonly url: string; readonly retrieved: string; readonly sha256: string }>;
  readonly upstream: { readonly repository: string; readonly commit: string; readonly path: string; readonly sha256: string };
}

const here = new URL(".", import.meta.url).pathname;
const fixtures = join(here, "fixtures");
const pluginData = join(here, "../../plugins/payroll-tax-us/data");
// The fixture's first source is stamped with the real repository and commit, except where a check gives others; the
// second source's commit stands for the synthetic files.
const SYNTHETIC = "0000000000000000000000000000000000000000";

const scratch: Array<string> = [];
afterEach(async () => {
  for (const dir of scratch.splice(0)) await rm(dir, { recursive: true, force: true });
});

/** The fixtures copied into a scratch folder, with `plant` run on the copy, and `out`, not made yet. */
const world = async (plant?: (root: string) => Promise<void>) => {
  const root = await mkdtemp(join(tmpdir(), "tax-us-import-"));
  scratch.push(root);
  await cp(join(fixtures, "open-withholding"), join(root, "ow"), { recursive: true });
  await cp(join(fixtures, "second-source"), join(root, "nk"), { recursive: true });
  if (plant) await plant(root);
  return { root, out: join(root, "out") };
};

const options = (root: string, out: string, settled: ReadonlyArray<Settled> = settledFixture, first: { repository: string; commit: string } = FIRST_SOURCE) => ({
  firstSource: { root: join(root, "ow"), repository: first.repository, commit: first.commit },
  secondSource: { root: join(root, "nk"), repository: SECOND_SOURCE.repository, commit: SYNTHETIC },
  settled,
  out,
});

const run = <A, E>(effect: Effect.Effect<A, E, never>) => Effect.runPromise(effect);
const runImport = (o: ReturnType<typeof options>) => run(importRows(o).pipe(Effect.provide(NodeServices.layer)));
const stopped = (o: ReturnType<typeof options>) => run(Effect.flip(importRows(o)).pipe(Effect.provide(NodeServices.layer)));
const verify = (dir: string) => run(verifyManifest(dir).pipe(Effect.provide(NodeServices.layer)));
const mismatch = (dir: string) => run(Effect.flip(verifyManifest(dir)).pipe(Effect.provide(NodeServices.layer)));
/** It stopped as `expected`, and made nothing. */
const stopsWith = async (o: ReturnType<typeof options>, expected: Record<string, unknown>) => {
  expect(await stopped(o)).toMatchObject(expected);
  await expect(readdir(o.out), "out is not made when the import stops").rejects.toThrow();
};

const edit = async (path: string, from: string, to: string) => {
  const text = await readFile(path, "utf8");
  expect(text.split(from).length, `${from} once in ${path}`).toBe(2);
  await writeFile(path, text.replace(from, to));
};
const sha = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const files = async (dir: string): Promise<Array<string>> => {
  const found: Array<string> = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) found.push(relative(dir, join(entry.parentPath, entry.name)));
  }
  return found.sort();
};
const rowsOf = async (path: string): Promise<ReadonlyArray<TaxRow>> =>
  (await import(`${pathToFileURL(path).href}?${sha(await readFile(path))}`)).rows;
/** A generated file: its header, then `export const rows`, and no other import or export. */
const expectGeneratedShape = (text: string, header: string, path: string) => {
  const [first, ...rest] = text.split("\n");
  expect(first, path).toBe(header);
  expect(rest.join("\n"), `${path}: rows come straight after the header`).toMatch(/^export const rows\b/);
  expect(text.match(/\bexport\b/g)?.length, `${path}: one export`).toBe(1);
  expect(text, `${path}: imports nothing`).not.toMatch(/\bimport\b|\brequire\s*\(/);
};

// The expected rows, read by the author from the nine fixture files it reads (fixtures/open-withholding/SOURCE.json);
// Detroit's, under locals/, gives no row and is not in the manifest.
const commit = FIRST_SOURCE.commit;
const repository = FIRST_SOURCE.repository;
const nearest = { to: "0.01", mode: "nearest", intermediate: "none" };
const upstreamSha = JSON.parse(await readFile(join(fixtures, "open-withholding/SOURCE.json"), "utf8")).files as Record<string, string>;
const from = (path: string) => ({ repository, commit, path, sha256: upstreamSha[path] ?? `${path} is not in SOURCE.json` });
const readUpstream = Object.fromEntries(Object.entries(upstreamSha).filter(([path]) => !path.includes("/locals/")));
const flat = (rate: string, keys: ReadonlyArray<string>) => Object.fromEntries(keys.map((k) => [k, [{ from: "0", to: null, rate, base: "0" }]]));
const gaStatuses = ["married_joint", "single", "head_of_household", "married_filing_separate"];
const pub15 = "https://www.irs.gov/pub/irs-pdf/p15.pdf";
const p15sha = "b46c3622439d8521e3a0faca4cd5b5ece3451b526f65f06a5e38d5c9f804c88b";
const gaGuide = "Georgia Employer's Withholding Tax Guide (2026)";

const expected: Record<string, ReadonlyArray<TaxRow>> = {
  "2025/us-oh.ts": [
    {
      jurisdiction: "US-OH", tax: "state_income_withholding", effectiveFrom: "2025-10-01", effectiveTo: null, method: "annualized_percentage", rounding: nearest,
      brackets: {
        all: [
          { from: "0", to: "26050", rate: "0.01775", base: "0" },
          { from: "26050", to: "100000", rate: "0.02990", base: "462.39" },
          { from: "100000", to: null, rate: "0.03640", base: "2673.50" },
        ],
      },
      parameters: { allowance_amount: "650", credit_per_allowance: null },
      citations: [{
        document: "Ohio Employer Withholding: Optional Computer Formula (2025)",
        url: "https://dam.assets.ohio.gov/image/upload/tax.ohio.gov/employer_withholding/2025%20Withholding%20Tables/WHT_OptionalComputerFormula_2025.pdf",
        retrieved: "2026-07-09",
        sha256: "25fbf2b0905f52025f3306a1a4dcad3d2bf515a33afa110368533ed05910d405",
      }],
      upstream: from("data/us/oh/2025/withholding.yaml"),
    },
  ],
  "2026/us.ts": [
    {
      jurisdiction: "US", tax: "fica", effectiveFrom: "2026-01-01", effectiveTo: null, method: "fica", rounding: nearest, brackets: {},
      parameters: {
        social_security: { employee_rate: "0.062", employer_rate: "0.062", wage_base: "184500" },
        medicare: { employee_rate: "0.0145", employer_rate: "0.0145", additional_employee_rate: "0.009", additional_threshold: "200000" },
      },
      citations: [{ document: "Publication 15 (Circular E), Employer's Tax Guide (2026)", url: pub15, retrieved: "2026-07-21", sha256: p15sha }],
      upstream: from("data/us/federal/2026/fica.yaml"),
    },
    {
      jurisdiction: "US", tax: "futa", effectiveFrom: "2026-01-01", effectiveTo: null, method: "futa", rounding: nearest, brackets: {},
      parameters: { rate: "0.060", wage_base: "7000", max_credit: "0.054" },
      citations: [{ document: "Publication 15 (Circular E), Employer's Tax Guide — FUTA (section 14) (2026)", url: pub15, retrieved: "2026-07-26", sha256: p15sha }],
      upstream: from("data/us/federal/2026/futa.yaml"),
    },
  ],
  "2026/us-fl.ts": [
    {
      jurisdiction: "US-FL", tax: "state_unemployment_insurance", effectiveFrom: "2026-01-01", effectiveTo: null, method: "sui", rounding: nearest, brackets: {},
      parameters: { wage_base: "7000", new_employer_rate: "0.0270", rate_range: { min: "0.0010", max: "0.0540" } },
      citations: [
        { document: "Florida DOR reemployment tax page (HTML)", url: "https://floridarevenue.com/taxes/taxesfees/Pages/reemployment.aspx", retrieved: "2026-10-29", sha256: "8ebf36e40a002d022a1062ff8d53d00caff11ee20ff17d4fc49b29352e5a1b42" },
        { document: "Florida DOR Reemployment Tax Rate Information page (HTML)", url: "https://floridarevenue.com/taxes/taxesfees/Pages/rt_rate.aspx", retrieved: "2026-10-29", sha256: "db223ec79bf4873edca7f2e9312f023bfbd2955fa0997ec8547f90627d24fb87" },
      ],
      upstream: from("data/us/fl/2026/sui.yaml"),
    },
  ],
  "2026/us-ga.ts": [
    {
      jurisdiction: "US-GA", tax: "state_income_withholding", effectiveFrom: "2026-01-01", effectiveTo: "2026-05-10", method: "annualized_percentage", rounding: nearest,
      brackets: flat("0.0519", gaStatuses),
      parameters: { standard_deduction: { married_joint: "24000", single: "12000", head_of_household: "12000", married_filing_separate: "12000" }, allowance_amount: "4000", credit_per_allowance: null },
      citations: [{ document: gaGuide, url: "https://dor.georgia.gov/employers-tax-guide", retrieved: "2026-07-12", sha256: "30c200e2e643aaecc589ea9a6f717102ebe851b4d4f96c326f8b7e7d4523126e" }],
      upstream: from("data/us/ga/2026/withholding-2026-01-01.yaml"),
    },
    {
      jurisdiction: "US-GA", tax: "state_income_withholding", effectiveFrom: "2026-05-11", effectiveTo: null, method: "annualized_percentage", rounding: nearest,
      brackets: flat("0.0499", gaStatuses),
      parameters: { standard_deduction: { married_joint: "30000", single: "15000", head_of_household: "15000", married_filing_separate: "15000" }, allowance_amount: "5000", credit_per_allowance: null },
      citations: [{
        document: gaGuide,
        url: "https://dor.georgia.gov/document/document-document/2026-employers-tax-guide-updated-june-2026/download",
        retrieved: "2026-07-08",
        sha256: "79ca8b41119eb2bd27755863899c8d627ee507d575e760adfb2398bcb06a3483",
      }],
      upstream: from("data/us/ga/2026/withholding.yaml"),
    },
    {
      jurisdiction: "US-GA", tax: "state_unemployment_insurance", effectiveFrom: "2026-01-01", effectiveTo: null, method: "sui", rounding: nearest, brackets: {},
      parameters: { wage_base: "9500", new_employer_rate: "0.0270", rate_range: null, surtaxes: [{ name: "Administrative Assessment", rate: "0.0008", wage_base: "9500" }] },
      citations: [
        { document: "Georgia DOL Employer Handbook DOL-224 (PDF)", url: "https://dol.georgia.gov/documents/employer-handbook", retrieved: "2026-11-03", sha256: "196737dff4530c1b1e57622cacf4b63167a35332ca72a3c0b76e29182dffca7c" },
        {
          document: "Georgia DOL blog: 2026 Employer Tax Rates Available Now (HTML)",
          url: "https://dol.georgia.gov/blog-post/2025-12-23/2026-employer-tax-rates-available-now",
          retrieved: "2026-11-03",
          sha256: "ee84e3379f6a09cb9815d026b2c10f488f433230bc17c23550dbbff22fc5175f",
        },
      ],
      upstream: from("data/us/ga/2026/sui.yaml"),
    },
  ],
  "2026/us-il.ts": [
    {
      jurisdiction: "US-IL", tax: "state_income_withholding", effectiveFrom: "2026-01-01", effectiveTo: null, method: "annualized_percentage", rounding: nearest,
      brackets: flat("0.0495", ["all"]),
      parameters: { allowance_amount: "2925", secondary_allowance_amount: "1000", credit_per_allowance: null },
      citations: [{
        document: "Booklet IL-700-T, Illinois Withholding Income Tax Tables (2026)",
        url: "https://tax.illinois.gov/content/dam/soi/en/web/tax/forms/withholding/documents/currentyear/il-700-t.pdf",
        retrieved: "2026-07-08",
        sha256: "f8f05eda8025bc8b80b7dee5fa9a69af04e2c32b3320386ace7027b5fc6d635e",
      }],
      upstream: from("data/us/il/2026/withholding.yaml"),
    },
  ],
  "2026/us-la.ts": [
    {
      jurisdiction: "US-LA", tax: "state_income_withholding", effectiveFrom: "2026-01-01", effectiveTo: null, method: "per_period_percentage", rounding: nearest,
      brackets: flat("0.0309", ["daily.all", "weekly.all", "biweekly.all", "semimonthly.all", "monthly.all", "annually.all"]),
      parameters: { standard_deduction: { no_standard_deduction: "0", single: "12875", married_joint: "25750" } },
      citations: [{ document: "R-1306, Louisiana Withholding Tables and Formulas (2026)", url: "https://dam.ldr.la.gov/taxforms/1306-1-26.pdf", retrieved: "2026-07-09", sha256: "894da1932daa836b9817ccb1515ba81913838cb2957f7948368c4e67a2daab27" }],
      upstream: from("data/us/la/2026/withholding.yaml"),
    },
  ],
};
const header = (folder: string, at: string = commit) => `// Generated from open-withholding data/us/${folder}/ at ${at}. Do not edit.`;
const folders: Record<string, string> = {
  "2025/us-oh.ts": "oh/2025", "2026/us.ts": "federal/2026", "2026/us-fl.ts": "fl/2026", "2026/us-ga.ts": "ga/2026", "2026/us-il.ts": "il/2026", "2026/us-la.ts": "la/2026",
};

describe("the importer on the fixture", () => {
  it("writes each jurisdiction's rows, cited and dated, and a manifest of every file", async () => {
    const { root, out } = await world();
    const report = await runImport(options(root, out));
    expect(report).toEqual({ rows: 9, settled: ["ga-hoh-deduction-fixture", "medicare-additional-rate-fixture"] });
    expect(await files(out)).toEqual([...Object.keys(expected), "manifest.json"].sort());
    for (const [path, rows] of Object.entries(expected)) {
      expectGeneratedShape(await readFile(join(out, path), "utf8"), header(folders[path] ?? path), path);
      expect(await rowsOf(join(out, path)), path).toEqual(rows);
    }
    const manifest = JSON.parse(await readFile(join(out, "manifest.json"), "utf8"));
    expect(manifest).toEqual({
      firstSource: { repository, commit },
      secondSource: { repository: SECOND_SOURCE.repository, commit: SYNTHETIC },
      upstream: readUpstream,
      generated: Object.fromEntries(await Promise.all(Object.keys(expected).sort().map(async (p) => [p, sha(await readFile(join(out, p)))]))),
    });
    await verify(out);
  });

  it("stamps the repository and commit it is given", async () => {
    const fork = { repository: "https://example.test/a-fork-of-open-withholding", commit: "c0ffee0c0ffee0c0ffee0c0ffee0c0ffee0c0ffe" };
    const { root, out } = await world();
    await runImport(options(root, out, settledFixture, fork));
    for (const path of Object.keys(expected)) {
      expect((await readFile(join(out, path), "utf8")).split("\n")[0], path).toBe(header(folders[path] ?? path, fork.commit));
      for (const row of await rowsOf(join(out, path))) expect({ repository: row.upstream.repository, commit: row.upstream.commit }, path).toEqual(fork);
    }
    expect(JSON.parse(await readFile(join(out, "manifest.json"), "utf8")).firstSource).toEqual(fork);
  });

  it("files each row under its upstream folder's year, whatever its date", async () => {
    const { root, out } = await world((r) => edit(join(r, "ow/data/us/oh/2025/withholding.yaml"), "effective_from: '2025-10-01'", "effective_from: '2026-01-01'"));
    await runImport(options(root, out));
    expect(await files(out)).toContain("2025/us-oh.ts");
    expect((await rowsOf(join(out, "2025/us-oh.ts")))[0]?.effectiveFrom).toBe("2026-01-01");
  });

  it("writes the same bytes on a second run", async () => {
    const first = await world();
    const second = await world();
    await runImport(options(first.root, first.out));
    await runImport(options(second.root, second.out));
    for (const path of await files(first.out)) {
      expect(await readFile(join(second.out, path), "utf8"), path).toBe(await readFile(join(first.out, path), "utf8"));
    }
  });

  it("carries a figure the second source changed nowhere into its row: a planted fixture row shows in the output", async () => {
    // The FUTA wage base is open-withholding's alone, so the second source can't catch it; the rows must still carry it.
    const { root, out } = await world((r) => edit(join(r, "ow/data/us/federal/2026/futa.yaml"), "wage_base: '7000'", "wage_base: '7001'"));
    await runImport(options(root, out));
    const futa = (await rowsOf(join(out, "2026/us.ts"))).find((row) => row.tax === "futa");
    expect(futa?.parameters).toEqual({ rate: "0.060", wage_base: "7001", max_credit: "0.054" });
    expect(futa?.upstream.sha256).not.toBe(upstreamSha["data/us/federal/2026/futa.yaml"]);
  });
});

const income = "data/tax/2026/state-income-tax.json";
const fica = "data/tax/2026/fica.json";
/** Any filing status: a figure open-withholding holds for "all" is compared against each of the second source's. */
const anyStatus = (state: string, bracket: number, column: number) => expect.stringMatching(new RegExp(`^/states/${state}/0/brackets/(single|married_jointly|head_of_household)/${bracket}/${column}$`));
// Each plant changes one figure the two sources share, on one side, and the importer must stop naming it.
const disagreements: ReadonlyArray<{ readonly name: string; readonly side: "ow" | "nk"; readonly file: string; readonly from: string; readonly to: string; readonly upstream: string; readonly second: { readonly file: string; readonly pointer: unknown } }> = [
  { name: "Social Security's wage base, in the second source", side: "nk", file: fica, from: "\"wageBase\": 184500", to: "\"wageBase\": 184501", upstream: "data/us/federal/2026/fica.yaml", second: { file: fica, pointer: "/socialSecurity/wageBase" } },
  { name: "Social Security's rate, in the second source", side: "nk", file: fica, from: "\"rate\": 0.062", to: "\"rate\": 0.063", upstream: "data/us/federal/2026/fica.yaml", second: { file: fica, pointer: "/socialSecurity/rate" } },
  { name: "Social Security's employee rate, in open-withholding", side: "ow", file: "data/us/federal/2026/fica.yaml", from: "    employee_rate: '0.062'", to: "    employee_rate: '0.061'", upstream: "data/us/federal/2026/fica.yaml", second: { file: fica, pointer: "/socialSecurity/rate" } },
  { name: "Social Security's employer rate, in open-withholding", side: "ow", file: "data/us/federal/2026/fica.yaml", from: "    employer_rate: '0.062'", to: "    employer_rate: '0.063'", upstream: "data/us/federal/2026/fica.yaml", second: { file: fica, pointer: "/socialSecurity/rate" } },
  { name: "the additional Medicare threshold, in open-withholding", side: "ow", file: "data/us/federal/2026/fica.yaml", from: "additional_threshold: '200000'", to: "additional_threshold: '250000'", upstream: "data/us/federal/2026/fica.yaml", second: { file: fica, pointer: "/medicare/additionalThreshold" } },
  { name: "Medicare's rate, in the second source", side: "nk", file: fica, from: "\"rate\": 0.0145", to: "\"rate\": 0.0146", upstream: "data/us/federal/2026/fica.yaml", second: { file: fica, pointer: "/medicare/rate" } },
  { name: "the additional Medicare rate a settled entry covers, in open-withholding", side: "ow", file: "data/us/federal/2026/fica.yaml", from: "additional_employee_rate: '0.009'", to: "additional_employee_rate: '0.0092'", upstream: "data/us/federal/2026/fica.yaml", second: { file: fica, pointer: "/medicare/additionalRate" } },
  { name: "Illinois' Line 1 allowance, in open-withholding", side: "ow", file: "data/us/il/2026/withholding.yaml", from: "allowance_amount: '2925'", to: "allowance_amount: '2926'", upstream: "data/us/il/2026/withholding.yaml", second: { file: income, pointer: "/states/IL/0/exemptionPerAllowance" } },
  { name: "Illinois' single rate, in the second source", side: "nk", file: income, from: "\"single\": [[0, 0, 0.0495]]", to: "\"single\": [[0, 0, 0.0496]]", upstream: "data/us/il/2026/withholding.yaml", second: { file: income, pointer: "/states/IL/0/brackets/single/0/2" } },
  { name: "Illinois' married rate, in the second source", side: "nk", file: income, from: "\"married_jointly\": [[0, 0, 0.0495]]", to: "\"married_jointly\": [[0, 0, 0.0496]]", upstream: "data/us/il/2026/withholding.yaml", second: { file: income, pointer: "/states/IL/0/brackets/married_jointly/0/2" } },
  { name: "Georgia's January allowance, in the second source", side: "nk", file: income, from: "\"exemptionPerAllowance\": 4000", to: "\"exemptionPerAllowance\": 4500", upstream: "data/us/ga/2026/withholding-2026-01-01.yaml", second: { file: income, pointer: "/states/GA/1/exemptionPerAllowance" } },
  { name: "Georgia's January single deduction, in the second source", side: "nk", file: income, from: "\"single\": 12000", to: "\"single\": 12500", upstream: "data/us/ga/2026/withholding-2026-01-01.yaml", second: { file: income, pointer: "/states/GA/1/annualStandardDeduction/single" } },
  { name: "Georgia's married deduction from 11 May, in open-withholding", side: "ow", file: "data/us/ga/2026/withholding.yaml", from: "married_joint: '30000'", to: "married_joint: '31000'", upstream: "data/us/ga/2026/withholding.yaml", second: { file: income, pointer: "/states/GA/0/annualStandardDeduction/married_jointly_sole_earner" } },
  { name: "Georgia's rate from 11 May, in the second source", side: "nk", file: income, from: "\"head_of_household\": [[0, 0, 0.0499]]", to: "\"head_of_household\": [[0, 0, 0.0599]]", upstream: "data/us/ga/2026/withholding.yaml", second: { file: income, pointer: "/states/GA/0/brackets/head_of_household/0/2" } },
  { name: "Ohio's second bracket's start, in the second source", side: "nk", file: income, from: "\"single\": [[0, 0, 0.01775], [26050,", to: "\"single\": [[0, 0, 0.01775], [26051,", upstream: "data/us/oh/2025/withholding.yaml", second: { file: income, pointer: "/states/OH/0/brackets/single/1/0" } },
  { name: "Ohio's second bracket's base, in open-withholding", side: "ow", file: "data/us/oh/2025/withholding.yaml", from: "base: '462.39'", to: "base: '462.40'", upstream: "data/us/oh/2025/withholding.yaml", second: { file: income, pointer: anyStatus("OH", 1, 1) } },
  { name: "Ohio's top rate, in open-withholding", side: "ow", file: "data/us/oh/2025/withholding.yaml", from: "rate: '0.03640'", to: "rate: '0.03650'", upstream: "data/us/oh/2025/withholding.yaml", second: { file: income, pointer: anyStatus("OH", 2, 2) } },
];

describe("the importer stops on a disagreement no settled entry covers, naming the figure, and writes nothing", () => {
  for (const plant of disagreements) {
    it(plant.name, async () => {
      const { root, out } = await world((r) => edit(join(r, plant.side, plant.file), plant.from, plant.to));
      await stopsWith(options(root, out), { _tag: "Disagreement", firstSource: { path: plant.upstream }, secondSource: plant.second });
    });
  }
});

const hoh = "/states/GA/0/annualStandardDeduction/head_of_household";
const withEntry = (id: string, change: (e: Settled) => Settled) => settledFixture.map((e) => (e.id === id ? change(e) : e));

describe("the settled list judges the import, and the import writes nothing when it stops", () => {
  it("stops when a settled entry's figures changed, naming the entry", async () => {
    const { root, out } = await world((r) => edit(join(r, "nk", income), "\"head_of_household\": 15750", "\"head_of_household\": 15751"));
    await stopsWith(options(root, out), { _tag: "SettledChanged", id: "ga-hoh-deduction-fixture" });
  });

  it("stops when an entry that covers nothing has changed figures too", async () => {
    const { root, out } = await world((r) => edit(join(r, "nk", income), "\"exemptionPerAllowance\": 2925", "\"exemptionPerAllowance\": 2926"));
    await stopsWith(options(root, out, withEntry("il-line-2-fixture", (e) => e)), { _tag: "SettledChanged", id: "il-line-2-fixture" });
  });

  it("stops when an entry's recorded hash is not its figures' hash", async () => {
    const { root, out } = await world();
    await stopsWith(options(root, out, withEntry("il-line-2-fixture", (e) => ({ ...e, secondSource: { ...e.secondSource, sha256: sha("[2926]") } }))), { _tag: "SettledChanged", id: "il-line-2-fixture" });
  });

  it("stops on the disagreement once its entry is taken off the list", async () => {
    const { root, out } = await world();
    await stopsWith(options(root, out, settledFixture.filter((e) => e.id !== "ga-hoh-deduction-fixture")), {
      _tag: "Disagreement",
      firstSource: { path: "data/us/ga/2026/withholding.yaml" },
      secondSource: { file: income, pointer: hoh },
    });
  });

  it("does not let an entry for one figure cover another", async () => {
    const { root, out } = await world();
    const settled = withEntry("ga-hoh-deduction-fixture", (e) => ({ ...e, covers: [{ pointer: "/states/GA/0/annualStandardDeduction/single", first: "15000" }] }));
    await stopsWith(options(root, out, settled), { _tag: "Disagreement", secondSource: { pointer: hoh } });
  });

  it("does not let an entry cover the pointers below the one it names", async () => {
    const { root, out } = await world();
    const settled = withEntry("ga-hoh-deduction-fixture", (e) => ({ ...e, covers: [{ pointer: "/states/GA/0/annualStandardDeduction", first: "15000" }] }));
    await stopsWith(options(root, out, settled), { _tag: "Disagreement", secondSource: { pointer: hoh } });
  });

  it("does not let an entry about one file cover a pointer in another", async () => {
    const { root, out } = await world();
    const settled = withEntry("ga-hoh-deduction-fixture", (e) => ({ ...e, secondSource: { file: fica, figures: ["/socialSecurity/wageBase"], sha256: sha("[184500]") } }));
    await stopsWith(options(root, out, settled), { _tag: "Disagreement", secondSource: { file: income, pointer: hoh } });
  });

  it("stops when open-withholding's figure at a covered pointer is no longer the one the entry settled", async () => {
    const { root, out } = await world((r) => edit(join(r, "ow/data/us/ga/2026/withholding.yaml"), "head_of_household: '15000'", "head_of_household: '15001'"));
    await stopsWith(options(root, out), { _tag: "Disagreement", firstSource: { path: "data/us/ga/2026/withholding.yaml" }, secondSource: { file: income, pointer: hoh } });
  });

  it("does not let an entry that covers nothing settle the figure it hashes", async () => {
    // il-line-2-fixture hashes Illinois' Line 1 figure as evidence; a Line 1 disagreement is still a disagreement.
    const { root, out } = await world((r) => edit(join(r, "nk", income), "\"exemptionPerAllowance\": 2925", "\"exemptionPerAllowance\": 2900"));
    const settled = withEntry("il-line-2-fixture", (e) => ({ ...e, secondSource: { ...e.secondSource, figures: ["/states/IL/0/exemptionPerAllowance"], sha256: sha("[2900]") } }));
    await stopsWith(options(root, out, settled), { _tag: "Disagreement", secondSource: { pointer: "/states/IL/0/exemptionPerAllowance" } });
  });

  it("stops when any of an entry's pointers resolves to nothing, naming it", async () => {
    const { root, out } = await world();
    const settled = withEntry("il-line-2-fixture", (e) => ({ ...e, secondSource: { ...e.secondSource, figures: ["/states/IL/0/exemptionPerAllowance", "/states/IL/0/lineThreeAllowance"] } }));
    await stopsWith(options(root, out, settled), { _tag: "SettledUnresolved", id: "il-line-2-fixture", pointer: "/states/IL/0/lineThreeAllowance" });
  });
});

describe("a hand edit fails the manifest", () => {
  const plants: ReadonlyArray<readonly [string, (out: string) => Promise<void>, string]> = [
    ["a row's figure changed", (out) => edit(join(out, "2026/us-il.ts"), "\"2925\"", "\"2926\""), "2026/us-il.ts"],
    ["a row's figure changed in another year", (out) => edit(join(out, "2025/us-oh.ts"), "\"462.39\"", "\"462.40\""), "2025/us-oh.ts"],
    ["a row file deleted", (out) => rm(join(out, "2026/us-ga.ts")), "2026/us-ga.ts"],
    ["a row file added", (out) => writeFile(join(out, "2026/us-ny.ts"), "export const rows = [];\n"), "2026/us-ny.ts"],
    ["a row file added in a year of its own", (out) => cp(join(out, "2026/us.ts"), join(out, "2027/us.ts")), "2027/us.ts"],
    ["a file that is not a row file added", (out) => writeFile(join(out, "2026/notes.txt"), "typed by hand\n"), "2026/notes.txt"],
  ];
  for (const [name, plant, path] of plants) {
    it(name, async () => {
      const { root, out } = await world();
      await runImport(options(root, out));
      await plant(out);
      expect(await mismatch(out)).toMatchObject({ _tag: "ManifestMismatch", path });
    });
  }
});

describe("the piece's committed rows", () => {
  it("match data/manifest.json, cite their document and carry the pinned commit", async () => {
    await verify(pluginData);
    const manifest = JSON.parse(await readFile(join(pluginData, "manifest.json"), "utf8"));
    expect(manifest.firstSource).toEqual(FIRST_SOURCE);
    expect(manifest.secondSource).toEqual(SECOND_SOURCE);
    const generated = Object.keys(manifest.generated);
    expect(generated).toEqual(expect.arrayContaining(["2026/us.ts", "2026/us-ca.ts", "2026/us-ny.ts"]));
    for (const path of generated) {
      const text = await readFile(join(pluginData, path), "utf8");
      const folder = text.split("\n")[0]?.match(/^\/\/ Generated from open-withholding data\/us\/([a-z]+\/\d{4})\/ at /)?.[1] ?? "no header";
      expect(folder.slice(-4), path).toBe(path.slice(0, 4));
      expectGeneratedShape(text, header(folder), path);
      const rows = await rowsOf(join(pluginData, path));
      expect(rows.length, path).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.citations.length, `${path} ${row.tax}`).toBeGreaterThan(0);
        for (const citation of row.citations) {
          expect(citation.sha256, `${path} ${row.tax}`).toMatch(/^[0-9a-f]{64}$/);
          expect(citation.url, `${path} ${row.tax}`).toMatch(/^https:\/\//);
        }
        expect(row.upstream.commit, `${path} ${row.tax}`).toBe(FIRST_SOURCE.commit);
        expect(manifest.upstream[row.upstream.path], `${path} ${row.upstream.path}`).toBe(row.upstream.sha256);
      }
    }
  });
});
