import { Blueprint } from "orthograph";
import { Seat, Treasury } from "./thing.ts";

// An owner is whoever holds a seat on this treasury (K20).
export const owner = Blueprint.role(Treasury, {
  holds: Seat.fields.treasury,
  who: Seat.fields.owner,
});
