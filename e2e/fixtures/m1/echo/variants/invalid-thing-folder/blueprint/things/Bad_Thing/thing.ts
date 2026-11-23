import { Blueprint } from "orthograph";

// Planted: a thing's folder is lowercase words joined by dashes.
export const BadThing = Blueprint.thing({ description: "Badly named.", fields: { id: Blueprint.id("bad") }, code: "BT" });
