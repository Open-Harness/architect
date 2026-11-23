import { Blueprint } from "orthograph";

export const Probe = Blueprint.thing({ description: "Asks who is calling, for a journey to read.", fields: { id: Blueprint.id("prb") }, code: "PB" });
