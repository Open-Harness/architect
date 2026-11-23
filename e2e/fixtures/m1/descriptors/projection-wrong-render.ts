import { Blueprint } from "orthograph";

// @ts-expect-error render must give back an Effect of files, not text
export const bad = Blueprint.projection({ description: "Docs.", choices: {}, host: [], ships: [], render: () => "files" });
