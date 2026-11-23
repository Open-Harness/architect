// M1.42: the CLI's flags and help on acme's model.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { renderCli } from "./internal/cli.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), resolve(repo, "examples/acme")], { encoding: "utf8" })) as Model;

describe("the CLI's flags", () => {
  const command = (path: string) => renderCli(acme, "acme").find((f) => f.path === path)!.content;

  it("take a number as a number flag when it fits, and as text with its type token when it does not", () => {
    // acme's amounts are 128 bits: text, token `uint`, so no digit is lost.
    expect(command("generated/cli/src/allowance/grant.ts")).toContain('Flag.String("limit").pipe(Flag.withMetavar("uint")');
  });

  it("name a plain schema value by its name, never as JSON", () => {
    const flags = Object.values(acme.operations).filter((o) => Object.values(o.payload).some((f) => f.value.type === "schema" && f.value.format !== "ref-any"));
    for (const op of flags) expect(command(`generated/cli/src/${op.thing}/${op.verb}.ts`)).not.toContain('Flag.withMetavar("json"), Flag.withDescription("A JSON value.")');
  });

  it("carry the operation's description and the states of its move in --help", () => {
    const grant = command("generated/cli/src/allowance/grant.ts");
    expect(grant).toContain(acme.operations["allowance.grant"]!.description);
    expect(grant).toMatch(/Command\.withDescription\(".*Creates an allowance, which starts [a-z]+\./);
    expect(grant).not.toContain("into being");
    expect(command("generated/cli/src/allowance/revoke.ts")).toMatch(/Moves an allowance from [a-z, ]+ to [a-z]+\./);
  });

  it("say something of every flag, from its field when it has no description, and never a bare \"Text.\"", () => {
    for (const f of renderCli(acme, "acme").filter((f) => f.path.includes("/cli/src/") && f.content.includes("Flag.withDescription"))) {
      expect(f.content, f.path).not.toMatch(/Flag\.withDescription\("Text\."\)/);
    }
    expect(command("generated/cli/src/person/sign-up.ts")).toMatch(/Flag\.withDescription\("Person email: text of up to 254 characters\."\)/);
  });

  it("give the device sign-in commands their descriptions and typed, described flags too", () => {
    for (const file of ["generated/cli/src/session/sign-in.ts", "generated/cli/src/session/show.ts"]) {
      const text = command(file);
      expect(text, file).toContain("Command.withDescription(");
      expect(text, file).toContain('Flag.withDescription("');
      expect(text, file).toContain('Flag.String("env").pipe(Flag.withMetavar("env")');
      expect(text, file).not.toContain("Every flag is text");
    }
    expect(command("generated/cli/src/session/sign-in.ts")).toContain('Flag.withMetavar("password")');
  });
});
