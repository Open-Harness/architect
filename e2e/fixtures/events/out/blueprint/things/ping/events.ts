import { Blueprint } from "orthograph";
import { Ping } from "./thing.ts";
import { Email } from "../../values/people.ts";

export const Pinged = Blueprint.event({ ping: Ping.fields.id, to: Email });
