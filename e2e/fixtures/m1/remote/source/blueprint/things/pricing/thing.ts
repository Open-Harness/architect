import { Blueprint } from "orthograph";

export const Pricing = Blueprint.thing({ description: "What the outside service quotes.", fields: { id: Blueprint.id("prc") }, code: "PC" });
