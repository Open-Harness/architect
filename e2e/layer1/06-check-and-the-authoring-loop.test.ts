// Check 6: the allowance is built on the starter by Orthograph's own commands, and check holds the rules throughout.
// add writes a thing of blanks that check names; with the declarations written, generate scaffolds each handler once;
// with the handlers and journeys written, generate again (journeys are an input to generate: the model and the portal
// blueprint carry them), then check and prove pass. Each of the journey author's check fixtures fails it.
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { acme, ortho, copyOf, nothingRunning, repo } from "./support.ts";

// Dot-folders (.wrangler, .ortho) belong to whatever is running there; a filter also keeps cpSync off its native path,
// which aborts the process when a folder vanishes mid-copy.
const visible = (from: string) => !basename(from).startsWith(".");

const starter = join(repo, "examples/starter");

describe("check 6: ortho add, generate and check build the allowance on the starter", () => {
  it("blanks, then scaffolds, then a project that checks and proves", () => {
    // The starter as the preset writes it. add writes the allowance's blanks; the filled declarations, handlers and
    // journeys then come from acme, so what this proves is blanks, scaffolds and check, not authoring.
    const project = copyOf(starter);
    const { root } = project;
    try {
      const added = ortho(root, "add", "thing", "allowance");
      // The six files add wrote before G5, by name and in order; G5's `invariants.ts` (ST1.17) is the one more line the output may carry, and
      // anything else is a failure. No count is pinned: the check holds each of the six, and refuses a stranger.
      const wrote = (path: string) => `wrote blueprint/${path}`;
      const lines = added.stdout.trim().split("\n");
      const invariants = wrote("things/allowance/invariants.ts");
      expect(lines.filter((l) => l !== invariants)).toEqual([
        "things/allowance/thing.ts", "things/allowance/machine.ts", "things/allowance/roles.ts",
        "things/allowance/events.ts", "things/allowance/errors.ts", "values/allowance.ts",
      ].map(wrote));
      expect(lines.filter((l) => l === invariants).length).toBeLessThanOrEqual(1);
      const blank = ortho(root, "check");
      expect(blank.status).toBe(1);
      expect(blank.stdout.split("\n")[0]).toBe("allowance has 3 blanks");

      // The declarations written (acme's own, with its cap on organization), then generate.
      rmSync(join(root, "blueprint/things/allowance"), { recursive: true });
      for (const p of ["blueprint/things/allowance", "blueprint/things/organization", "blueprint/values/money.ts", "blueprint/starting-worlds/founded.ts", "blueprint/starting-worlds/funded.ts"]) {
        cpSync(join(acme, p), join(root, p), { recursive: true, filter: visible });
      }
      cpSync(join(acme, "src/organization/create.ts"), join(root, "src/organization/create.ts"));
      const generated = ortho(root, "generate");
      const scaffolds = generated.stdout.split("\n").filter((l) => l.endsWith("(scaffold: yours from now on)"));
      expect(scaffolds.map((l) => l.split(" ")[1])).toEqual([
        "src/allowance/grant.ts", "src/allowance/revoke.ts", "src/allowance/spend.ts",
      ]);
      expect(ortho(root, "generate").stdout.trim()).not.toContain("implementation/");

      // The handlers and journeys written: journeys change what generate writes (generated/model/model.json and
      // generated/portal/blueprint.json), so generate again before check, as the authoring loop goes: write, generate, check.
      for (const op of ["grant", "revoke", "spend"]) cpSync(join(acme, `src/allowance/${op}.ts`), join(root, `src/allowance/${op}.ts`));
      cpSync(join(acme, "journeys"), join(root, "journeys"), { recursive: true, filter: visible });
      expect(ortho(root, "generate").status).toBe(0);
      const checked = ortho(root, "check");
      expect(checked.stdout.trimEnd().split("\n").at(-1), checked.stdout).toBe("check ✔");
      const proved = ortho(root, "prove", "--env", "local", "--port", "0");
      expect(proved.stdout.trimEnd().split("\n").at(-1), proved.stdout).toBe("prove ✔");
      expect(proved.stdout).toMatch(/^allowance\.spend 9 evals ✔/m);
      expect(existsSync(join(root, "generated/docs/allowance/spend.md"))).toBe(true);
      nothingRunning(root);
    } finally {
      project.remove();
    }
  });

  const SPEND = "src/allowance/spend.ts";
  const fixtures = [
    ["check/edited-output/get.ts", "generated/api/src/allowance/get.ts", "no-edited-output"],
    ["check/name-as-string/spend.ts", SPEND, "no-name-as-string"],
    ["check/refusal-without-log/spend.ts", SPEND, "refusal-has-log"],
    ["types/undeclared-error/spend.ts", SPEND, "TS"],
  ] as const;
  for (const [fixture, over, rule] of fixtures) {
    it(`${fixture}: check exits 1 naming ${over} and ${rule}`, () => {
      const project = copyOf(acme);
      try {
        expect(readFileSync(join(acme, "test/fixtures", fixture), "utf8")).not.toBe("");
        cpSync(join(acme, "test/fixtures", fixture), join(project.root, over));
        const run = ortho(project.root, "check");
        expect(run.status).toBe(1);
        expect(run.stdout.split("\n").some((l) => l.includes(over) && l.includes(rule)), run.stdout).toBe(true);
      } finally {
        project.remove();
      }
    });
  }
});
