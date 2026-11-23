import { Blueprint } from "orthograph";

// @ts-expect-error a feature must say what it is
export const bad = Blueprint.feature({ choices: {}, needs: [] });
