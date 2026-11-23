import { AddRefused, type AddApi } from "./types.ts";
import { isThingName, kebab } from "./internal/names.ts";
import { journeysOf } from "./internal/journeys.ts";
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
};
