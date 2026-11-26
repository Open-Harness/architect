import { AddRefused, type AddApi } from "./types.ts";
import { isThingName, kebab } from "./internal/names.ts";
import { journeysOf } from "./internal/journeys.ts";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Effect } from "effect";
import { planDoctype } from "./internal/doctype-plan.ts";
import { journeyFile, operationFile, readFile, thingFiles } from "./internal/templates.ts";

const verbName = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const files: AddApi["plan"] = (what, name) => {
  if (what === "journey") {
    const file = kebab(name);
    return file === "" ? new AddRefused({ message: "a journey needs a title" }) : [journeyFile(name, file)];
  }
  if (what === "thing") return isThingName(name) ? thingFiles(name) : new AddRefused({ message: `"${name}" isn't a thing's name: lower case words joined by dashes` });
  const [thing = "", verb = "", ...rest] = name.split(".");
  if (rest.length > 0 || !isThingName(thing) || !verbName.test(verb)) return new AddRefused({ message: `"${name}" isn't <thing>.<verb>, like allowance.spend` });
  return [what === "read" ? readFile(thing, verb) : operationFile(thing, verb)];
};

export const Add: AddApi = {
  plan: (what, name, exists) => {
    const planned = files(what, name, exists);
    if (planned instanceof AddRefused) return planned;
    const there = planned.filter((f) => exists(f.path));
    return there.length > 0 ? new AddRefused({ message: `already there, so nothing was written: ${there.map((f) => f.path).join(", ")}` }) : planned;
  },
  journeys: journeysOf,
  fromDoctype: (input) =>
    Compiler.model.pipe(
      Effect.provide(nodeSource(input.root)),
      Effect.catchTags({
        BlueprintInvalid: (e) => Effect.fail(new AddRefused({ message: `the blueprint doesn't load, so nothing was written:\n${e.problems.join("\n")}` })),
        SourceError: (e) => Effect.fail(new AddRefused({ message: e.message })),
      }),
      Effect.flatMap((model) => planDoctype(model, input)),
    ),
};
