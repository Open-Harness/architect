import { Blueprint } from "orthograph";

// @ts-expect-error a feature has no such field
export const bad = Blueprint.feature({ description: "A feature.", choices: {}, needs: [], colour: "red" });
