// The parts of `add` that don't need an installed package: the scaffold, R1's override list and age, and the lockfile.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { firstPicks, mountFile } from "./internal/scaffold.ts";
import { THREE_DAYS_MS, ageOf, excluded, fromRegistry } from "./internal/age.ts";

const style = Blueprint.choice({ plain: "As given.", loud: "In capitals." });
const signer = { node: Blueprint.choice({ local: "Here.", remote: "There." }) };

describe("mounting", () => {
  it("writes each choice at its first option, under the scaffold header, importing only the package", () => {
    const picks = firstPicks({ style, signer });
    expect(picks).toEqual(["p.choices.signer.node.local", "p.choices.style.plain"]);
    const file = mountFile("@fixture/echo", "1.0.0", picks);
    expect(file.split("\n")[0]).toBe("// Scaffolded from @fixture/echo 1.0.0. Yours from now on.");
    expect(file).toContain('import echo from "@fixture/echo";');
    expect(file).toContain("export default Blueprint.use(echo, (p) => [p.choose(p.choices.signer.node.local), p.choose(p.choices.style.plain)]);");
    expect(mountFile("@x/no-choices", "2.0.0", [])).toContain("Blueprint.use(noChoices);");
  });

  it("reads the override list and the lockfile, and ages a release by the clock", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mounting-"));
    try {
      writeFileSync(join(dir, "pnpm-workspace.yaml"), "minimumReleaseAgeExclude:\n  - '@x/young' # its reason\n");
      expect(excluded(dir)).toEqual(["@x/young"]);
      writeFileSync(join(dir, "pnpm-lock.yaml"), "packages:\n\n  '@x/young@1.0.0':\n    resolution: {integrity: sha512-a}\n\n  '@x/local@1.0.0':\n    resolution: {tarball: file:x.tgz}\n");
      expect(fromRegistry(dir, "@x/young", "1.0.0")).toBe(true);
      expect(fromRegistry(dir, "@x/local", "1.0.0")).toBe(false);
      expect(fromRegistry(dir, "@x/absent", "1.0.0")).toBe(false);
      const age = await Effect.runPromise(Effect.gen(function* () {
        yield* TestClock.setTime(Date.parse("2026-11-18T00:00:00Z"));
        return yield* ageOf(() => Effect.succeed({ time: { "1.0.0": "2026-11-17T00:00:00Z" } }), "https://registry.test", "@x/young", "1.0.0");
      }).pipe(Effect.provide(TestClock.layer())));
      expect(age).toBe(THREE_DAYS_MS / 3);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
