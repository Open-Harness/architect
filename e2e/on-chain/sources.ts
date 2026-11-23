// What the budgets journeys say, read from their sources: each journey's name and declared cast, and for each step its title, the actor that
// runs it, the operation, whether that operation is a chain one (anything but a `Blueprint.read`), and how many transactions the step's
// `receipts({ sent })` says it sends. The check pins this per step (journeys.ts, PIN) and a test holds the pin to these sources, so a journey
// added, renamed or reworded without the pin fails rather than slipping past.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { repo } from "../layer1/support.ts";

export const budgets = join(repo, "examples/budgets");

export interface SourceStep { readonly name: string; readonly actor: string; readonly operation: string; readonly chain: boolean; readonly sent: number }
export interface SourceJourney { readonly name: string; readonly cast: ReadonlyArray<string>; readonly steps: ReadonlyArray<SourceStep> }

const verbIsRead = (verb: string) => /Blueprint\.read\(/.test(readFileSync(join(budgets, "blueprint/things/allowance/verbs", `${verb}.ts`), "utf8"));

export const readJourneys = (): ReadonlyArray<SourceJourney> =>
  readdirSync(join(budgets, "journeys")).filter((f) => f.endsWith(".ts")).sort().map((file) => {
    const text = readFileSync(join(budgets, "journeys", file), "utf8");
    const name = text.match(/Blueprint\.journey\(\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? `?${file}`;
    const cast = [...(text.match(/cast:\s*\{([^}]*)\}/)?.[1] ?? "").matchAll(/(\w+)\s*:/g)].map((m) => m[1]!).sort();
    const steps = text.split("s.step(").slice(1).map((block) => {
      const run = block.match(/s\.(\w+)\.run\(\s*(\w+)/);
      const verb = run?.[2] ?? "?";
      return {
        name: block.match(/^\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "?",
        actor: run?.[1] ?? "?",
        operation: `allowance.${verb}`,
        chain: run === null ? false : !verbIsRead(verb),
        sent: Number(block.match(/receipts\(\{\s*sent:\s*(\d+)/)?.[1] ?? 0),
      };
    });
    return { name, cast, steps };
  });
