import { Blueprint } from "orthograph";
import { Seat, Treasury } from "./thing.ts";

// An owner is whoever holds a seat on this treasury (K20).
export const owner = Blueprint.role(Treasury, {
  holds: Seat.fields.treasury,
  who: Seat.fields.owner,
});

// Enough owners to reach the treasury's threshold, acting as one.
export const owners = Blueprint.together(owner, Treasury.fields.threshold); // new
