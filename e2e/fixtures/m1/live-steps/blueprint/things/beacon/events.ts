import { Blueprint } from "orthograph";
import { Beacon } from "./thing.ts";

export const BeaconLit = Blueprint.event({ beacon: Beacon.fields.id });
