import { Blueprint } from "orthograph";
import { Ask } from "../thing.ts";

const addressee = Blueprint.role(Ask, { rule: (ask, principal) => ask.to === principal.person });

export default Blueprint.read(Ask, { by: "id", fields: ["title", "need", "shows", "options", "recommends", "about", "by", "answer"], allowed: [addressee] });
