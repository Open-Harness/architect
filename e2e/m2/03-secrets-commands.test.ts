// Check 03 (M2.04): `ortho secrets` lists what the mounts declare, with names and whether each is set, never a value; and
// `ortho secrets set <NAME>` sets one locally, the value read from stdin and never from argv, kept in the environment's
// `secrets.env` (mode 0600, `.ortho/environments/<env>/secrets.env`, the file prove already hands to wrangler), never in a file
// a person would commit (design/frame/secrets.md, "The commands" and "Where values come from").
//
// Assumptions beyond those documents (the PR body lists them for the lead):
//  1. `ortho secrets [--env <name>]` prints one line per declared secret, `NAME  how  kind  status`, `how` as `generated` or
//     `stored`, `kind` as `runtime`, `release` or `builder`, `status` starting `set` or `missing` (frame/secrets.md's example,
//     where the status may go on to say when, and a release secret says `in CI`). `--env` defaults to `local`. One header line is allowed.
//  2. `ortho secrets set <NAME>` takes the name the listing prints (the issue's reading); frame/secrets.md's `stripe.apiKey`
//     spelling is not used. The value is the whole of stdin without its final newline, kept as it is.
//  3. What a local `generated` secret, or a stored one with a declared test value, says before an environment has made it is left
//     open: no check reads it.
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { INVOICE, RUNTIME, allFiles, leaks, modeOf, rowsOf, run, secretsApp, secretsFile, valuesIn, withInput, type Copy, type Layout } from "./secrets-support.ts";

const copies: Array<Copy> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
const fresh = (layout: Layout = {}) => { const copy = secretsApp({ appSecrets: INVOICE, ...layout }); copies.push(copy); return copy; };

// Not the shape of any real key, and unlike any test value a declaration carries.
const VALUE = "sk_live_Zq7Kp2xL9vRb4NmT";
const OTHER = "second-Hw3Yd8cE5uFa1";
const KEY = "ORGANIZATIONS_SIGNING_KEY";
const ALL = [...RUNTIME, "ORGANIZATIONS_RELEASE_SEED", "ORGANIZATIONS_PUBLISH_TOKEN", "ORGANIZATIONS_QUERY_TOKEN"];
const statuses = (root: string, ...args: ReadonlyArray<string>) => new Map(rowsOf(run(root, "secrets", ...args).out).map((r) => [r.name, r.status] as const));
const filesOf = (root: string, env = "local") => readdirSync(join(root, ".ortho/environments", env));

describe("03 `ortho secrets` lists the declared secrets", () => {
  it("one row per declared secret (every kind), with how it is given and its kind, and no other line", () => {
    const said = run(fresh().root, "secrets");
    expect(said.status, said.out).toBe(0);
    const rows = rowsOf(said.out);
    expect(rows.map((r) => r.name).sort()).toEqual([...ALL].sort());
    const others = said.out.split("\n").filter((line) => line.trim() !== "" && !rows.some((r) => line.trim().startsWith(r.name)));
    expect(others.every((line) => /^name\s.*status/i.test(line.trim())), `besides the rows, at most a header (NAME ... STATUS): ${JSON.stringify(others)}`).toBe(true);
    expect(others.length).toBeLessThanOrEqual(1);
    const row = (name: string) => rows.find((r) => r.name === name);
    expect(row("AUTH_SECRET")).toMatchObject({ how: "generated", kind: "runtime" });
    expect(row("INVOICE_SIGNING")).toMatchObject({ how: "generated", kind: "runtime" });
    expect(row("LEDGER_KEY")).toMatchObject({ how: "stored", kind: "runtime" });
    expect(row("ORGANIZATIONS_SIGNING_KEY")).toMatchObject({ how: "stored", kind: "runtime" });
    expect(row("ORGANIZATIONS_WEBHOOK_SIGNING")).toMatchObject({ how: "stored", kind: "runtime" });
    expect(row("ORGANIZATIONS_RELEASE_SEED")).toMatchObject({ how: "generated", kind: "release" });
    expect(row("ORGANIZATIONS_PUBLISH_TOKEN")).toMatchObject({ how: "stored", kind: "release" });
    expect(row("ORGANIZATIONS_QUERY_TOKEN")).toMatchObject({ how: "stored", kind: "builder" });
    for (const r of rows) expect(r.status, `${r.name} says whether it is set`).toMatch(/^(set|missing)\b|^in CI\b/);
  });

  it("a stored secret with no value yet is missing, in every environment the blueprint has, one added included", () => {
    const { root } = fresh({ extraEnvironment: "preview" });
    for (const env of ["local", "test", "staging", "production", "preview"]) {
      const said = run(root, "secrets", "--env", env);
      expect(said.status, `${env}: ${said.out}`).toBe(0);
      expect(rowsOf(said.out).find((r) => r.name === KEY)?.status, env).toMatch(/^missing\b/);
      expect(rowsOf(said.out).map((r) => r.name), env).toContain("AUTH_SECRET");
    }
  });

  it("an environment the blueprint does not have is refused, naming it, while a real one is not", () => {
    const { root } = fresh();
    const said = run(root, "secrets", "--env", "nonesuch");
    expect(said.status).not.toBe(0);
    expect(said.out).toContain("nonesuch");
    expect(rowsOf(said.out)).toEqual([]);
    expect(run(root, "secrets", "--env", "local").status).toBe(0);
  });
});

describe("03 `ortho secrets set <NAME>` reads the value from stdin and keeps it where the environment keeps its values", () => {
  it("sets one locally: it is in secrets.env (0600), the listing says set for it and nothing else, and nothing printed shows any of the value", () => {
    const { root } = fresh();
    const before = statuses(root);
    const said = withInput(root, `${VALUE}\n`, "secrets", "set", KEY);
    expect(said.status, said.out).toBe(0);
    expect(leaks(said.out, VALUE), `setting one prints no part of it: ${said.out}`).toBe(false);
    expect(valuesIn(root).get(KEY), secretsFile(root)).toBe(VALUE);
    const raw = readFileSync(secretsFile(root), "utf8");
    expect(`\n${raw}`, "one line, the name, an equals sign, the value, as it was given").toContain(`\n${KEY}=${VALUE}\n`);
    expect(raw, "no blank line, no stray newline").not.toContain("\n\n");
    expect(modeOf(secretsFile(root)).toString(8), "only its owner reads it").toBe("600");
    const listed = run(root, "secrets");
    expect(listed.status, listed.out).toBe(0);
    expect(leaks(listed.out, VALUE), "listing never prints a value, or a part of one").toBe(false);
    const after = statuses(root);
    expect(after.get(KEY)).toMatch(/^set\b/);
    for (const [name, status] of before) if (name !== KEY) expect(after.get(name), `${name} is as it was`).toBe(status);
    expect(statuses(root, "--env", "production").get(KEY), "another environment is not touched").toMatch(/^missing\b/);
    expect(statuses(root, "--env", "test").get(KEY), "another environment is not touched").toMatch(/^missing\b/);
  });

  it("keeps the value as given: its padding stays, and only the one final newline goes", () => {
    const { root } = fresh();
    expect(withInput(root, "  padded value \n", "secrets", "set", KEY).status).toBe(0);
    expect(valuesIn(root).get(KEY)).toBe("  padded value ");
    expect(withInput(root, "no-final-newline", "secrets", "set", "LEDGER_KEY").status).toBe(0);
    expect(valuesIn(root).get("LEDGER_KEY")).toBe("no-final-newline");
    expect(readFileSync(secretsFile(root), "utf8")).toMatch(/(^|\n)LEDGER_KEY=no-final-newline\n/);
  });

  it("setting a second keeps the first, and setting the same one again replaces it", () => {
    const { root } = fresh();
    expect(withInput(root, `${VALUE}\n`, "secrets", "set", KEY).status).toBe(0);
    expect(withInput(root, `${OTHER}\n`, "secrets", "set", "ORGANIZATIONS_WEBHOOK_SIGNING").status).toBe(0);
    expect(valuesIn(root).get(KEY)).toBe(VALUE);
    expect(valuesIn(root).get("ORGANIZATIONS_WEBHOOK_SIGNING")).toBe(OTHER);
    expect(withInput(root, "replacement-value-0a1b2c\n", "secrets", "set", KEY).status).toBe(0);
    expect(valuesIn(root).get(KEY)).toBe("replacement-value-0a1b2c");
    expect(valuesIn(root).get("ORGANIZATIONS_WEBHOOK_SIGNING")).toBe(OTHER);
    expect(modeOf(secretsFile(root)).toString(8)).toBe("600");
  });

  it("the file is 0600 in every environment, and a file already readable by others is made 0600 again", () => {
    const { root } = fresh();
    for (const env of ["test", "staging", "production"]) {
      expect(withInput(root, `${VALUE}\n`, "secrets", "set", KEY, "--env", env).status, env).toBe(0);
      expect(modeOf(secretsFile(root, env)).toString(8), env).toBe("600");
    }
    mkdirSync(dirname(secretsFile(root, "local")), { recursive: true });
    writeFileSync(secretsFile(root, "local"), "LEDGER_KEY=kept-value\n", { mode: 0o644 });
    chmodSync(secretsFile(root, "local"), 0o644);
    expect(withInput(root, `${VALUE}\n`, "secrets", "set", KEY).status).toBe(0);
    expect(modeOf(secretsFile(root, "local")).toString(8), "a file that was readable by others").toBe("600");
    expect(valuesIn(root).get("LEDGER_KEY"), "what was in it stays").toBe("kept-value");
  });

  it("the value, or any part of it, is in no output of model, check, generate or secrets, and in no file but the environment's own secrets.env", () => {
    const { root } = fresh();
    expect(withInput(root, `${VALUE}\n`, "secrets", "set", KEY).status).toBe(0);
    for (const args of [["model", "--json"], ["generate"], ["check"], ["secrets"]]) {
      expect(leaks(run(root, ...args).out, VALUE), `ortho ${args.join(" ")}`).toBe(false);
    }
    const holding = allFiles(root, [".ortho"]).filter((file) => readFileSync(file, "utf8").includes(VALUE));
    expect(holding, "files outside .ortho/ that hold it").toEqual([]);
    const inOrtho = allFiles(join(root, ".ortho"), []).filter((file) => readFileSync(file, "utf8").includes(VALUE));
    expect(inOrtho, "and under .ortho/, only the one file").toEqual([secretsFile(root)]);
    expect(filesOf(root), "setting one writes nothing else beside it").toEqual(["secrets.env"]);
    expect(readdirSync(join(root, ".ortho/environments")), "and nowhere else").toEqual(["local"]);
  });

  it("refuses a value on the command line, as an argument or a flag: ps and shell history would see it, and nothing is written", () => {
    const { root } = fresh();
    // The command works (the value on stdin is kept), so what follows is a refusal of the argv, not of the command.
    expect(withInput(root, `${OTHER}\n`, "secrets", "set", KEY).status).toBe(0);
    for (const args of [["secrets", "set", KEY, VALUE], ["secrets", "set", KEY, `--value=${VALUE}`], ["secrets", "set", KEY, "--value", VALUE]]) {
      const said = withInput(root, `${VALUE}\n`, ...args);
      expect(said.status, `${args.slice(3).join(" ").replace(VALUE, "<value>")}: ${said.out}`).not.toBe(0);
      expect(leaks(said.out, VALUE), "the refusal does not echo it").toBe(false);
      expect(valuesIn(root).get(KEY), "neither the argument nor stdin was kept").toBe(OTHER);
    }
  });

  it("refuses an empty value, leaving the one already there", () => {
    const { root } = fresh();
    expect(withInput(root, `${VALUE}\n`, "secrets", "set", KEY).status).toBe(0);
    for (const input of ["", "\n"]) {
      const said = withInput(root, input, "secrets", "set", KEY);
      expect(said.status, said.out).not.toBe(0);
      expect(valuesIn(root).get(KEY)).toBe(VALUE);
    }
  });

  it("refuses a name nothing declares, naming it and every declared one, and writes nothing", () => {
    const { root } = fresh();
    const said = withInput(root, `${VALUE}\n`, "secrets", "set", "NO_SUCH_SECRET");
    expect(said.status).not.toBe(0);
    expect(said.out).toContain("NO_SUCH_SECRET");
    for (const name of ALL) expect(said.out, `says ${name} is declared`).toContain(name);
    expect(leaks(said.out, VALUE)).toBe(false);
    expect(existsSync(join(root, ".ortho/environments/local/secrets.env")) ? valuesIn(root).has("NO_SUCH_SECRET") : false).toBe(false);
  });

  it("refuses an environment the blueprint does not have, and writes nothing for it", () => {
    const { root } = fresh();
    const said = withInput(root, `${VALUE}\n`, "secrets", "set", KEY, "--env", "nonesuch");
    expect(said.status).not.toBe(0);
    expect(said.out).toContain("nonesuch");
    expect(existsSync(join(root, ".ortho/environments/nonesuch"))).toBe(false);
    expect(withInput(root, `${VALUE}\n`, "secrets", "set", KEY).status, "while the default one is fine").toBe(0);
  });

  it("a value set for one environment is in that environment's file alone, whichever the blueprint names (one added included)", () => {
    const { root } = fresh({ extraEnvironment: "preview" });
    for (const env of ["staging", "preview"]) {
      expect(withInput(root, `${VALUE}\n`, "secrets", "set", KEY, "--env", env).status, env).toBe(0);
      expect(valuesIn(root, env).get(KEY), env).toBe(VALUE);
      expect(modeOf(secretsFile(root, env)).toString(8), env).toBe("600");
    }
    expect(existsSync(secretsFile(root, "local")), "local was never set").toBe(false);
    expect(statuses(root, "--env", "preview").get(KEY)).toMatch(/^set\b/);
    expect(statuses(root).get(KEY)).toMatch(/^missing\b/);
  });
});
