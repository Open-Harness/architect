import { Blueprint } from "orthograph";
import { Bell } from "./thing.ts";
import { Count } from "../../values/counts.ts";
import { Instant } from "../../values/time.ts";

export const BellSet = Blueprint.event({ bell: Bell.fields.id, setAt: Instant });
export const BellChimed = Blueprint.event({ bell: Bell.fields.id, chimes: Count });
