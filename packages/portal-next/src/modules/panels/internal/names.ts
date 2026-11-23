// What the panels name: a page of the map is called by a title here (the map names pages by their file), and a thing or an environment by its own name.
import type { BlueprintWire } from "@orthograph/portal";

export const TITLES: Readonly<Record<string, string>> = {
  compare: "Compare environments",
  journeys: "Journeys",
  worlds: "Starting worlds",
  access: "Access",
  refusals: "Refusal codes",
  events: "Events",
  values: "Values",
  machines: "Machines",
  plugins: "Plugins and stores",
  monitor: "Monitor",
};

export const thingsOf = (b: BlueprintWire): ReadonlyArray<string> => Object.keys(b.model.things);
export const environmentsOf = (b: BlueprintWire): ReadonlyArray<string> => Object.values(b.model.environments ?? {}).map((e) => e.name);
