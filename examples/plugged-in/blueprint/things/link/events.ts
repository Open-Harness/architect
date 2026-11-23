import { Blueprint } from "orthograph";
import { Link } from "./thing.ts";

export const LinkAdded = Blueprint.event({ link: Link.fields.id });
export const LinkRemoved = Blueprint.event({ link: Link.fields.id });
