import { Blueprint } from "orthograph";
import { Kra } from "./thing.ts";

export const KraCreated = Blueprint.event({ kra: Kra.fields.id, company: Kra.fields.company });
