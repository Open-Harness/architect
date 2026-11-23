import { Blueprint } from "orthograph";

export const Audit = Blueprint.thing({ description: "A second thing, with a refusal of the same class name.", fields: { id: Blueprint.id("aud") }, code: "AU" });
