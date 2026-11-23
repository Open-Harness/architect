import { Blueprint } from "orthograph";

// Planted: the app already has a thing named allowance.
export const Allowance = Blueprint.thing({ description: "A second allowance.", fields: { id: Blueprint.id("zal") }, code: "ZA" });
