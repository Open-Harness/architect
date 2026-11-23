import { Blueprint } from "orthograph";
import { Lamp } from "./thing.ts";

export const LampLit = Blueprint.event({ lamp: Lamp.fields.id });
