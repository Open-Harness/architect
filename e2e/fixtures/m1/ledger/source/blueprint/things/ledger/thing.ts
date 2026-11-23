import { Blueprint } from "orthograph";

export const Ledger = Blueprint.thing({ description: "What the outside ledger holds.", fields: { id: Blueprint.id("ldg") }, code: "LG" });
