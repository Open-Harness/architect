import { Blueprint } from "orthograph";

export const Greet = Blueprint.thing({ description: "Something that greets.", fields: { id: Blueprint.id("gre") }, code: "GR" });
