// The second half of unit A1's done check (#1164): the adapters hand-written to the generator's shape (A2 erc20 #1162, A3 safe #1161,
// A4 zodiac-roles #1163) regenerate from their own abi/ with no change. Their generated files (abi/*.json, src/generated/*) must
// be byte for byte what `generate` makes of their abi/; their scaffolds and the files they add beside them are theirs. Red until
// each package exists and A1's builder has regenerated it; its own tests then stay green (`nx test <package>`).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { made, repo } from "../../../test/from-abi.ts";

const walk = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)).map((f) => `${d.name}/${f}`) : [d.name])) : [];

for (const name of ["erc20", "safe", "zodiac-roles"]) {
  describe(`@orthograph/${name} regenerates unchanged`, () => {
    const root = join(repo, "packages", name);
    const abiFiles = () => {
      if (!existsSync(join(root, "abi"))) throw new Error(`packages/${name}/abi/ does not exist: there is no ${name} adapter, with its contracts' ABIs, to regenerate`);
      const files = readdirSync(join(root, "abi")).filter((f) => f.endsWith(".json")).sort();
      if (files.length === 0) throw new Error(`packages/${name}/abi/ holds no ABI`);
      return files;
    };
    const regenerated = () => made(abiFiles().map((f) => ({ contract: f.slice(0, -".json".length), json: JSON.parse(readFileSync(join(root, "abi", f), "utf8")) as unknown })), name);

    it("is the package of that name", () => {
      const json = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { readonly name?: string; readonly orthograph?: { readonly kind?: string } };
      expect(json.name).toBe(`@orthograph/${name}`);
      expect(json.orthograph?.kind).toBe("adapter");
    });

    it("has every generated file exactly as the generator makes it from its abi/", async () => {
      for (const file of (await regenerated()).files.filter((f) => f.how === "generated")) {
        const path = join(root, file.path);
        expect(existsSync(path), `packages/${name}/${file.path} is missing`).toBe(true);
        expect(readFileSync(path, "utf8"), `packages/${name}/${file.path} differs from what the generator makes`).toBe(file.content);
      }
    });

    it("holds nothing in src/generated/ or abi/ that the generator doesn't make", async () => {
      const made = new Set((await regenerated()).files.filter((f) => f.how === "generated").map((f) => f.path));
      const present = [...walk(join(root, "src/generated")).map((f) => `src/generated/${f}`), ...walk(join(root, "abi")).map((f) => `abi/${f}`)];
      expect(present.filter((f) => !made.has(f))).toEqual([]);
    });
  });
}
