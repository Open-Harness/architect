import { Blueprint } from "orthograph";
import { Booking } from "./thing.ts";
import { machine } from "./machine.ts";
import { TableTaken } from "./errors.ts";

// A table seats one booking at a time. Only the keeper's `seat` can break it (G5 section 3), so only a keeper firing is refused.
export const oneSeatedPerTable = Blueprint.invariant.unique(Booking.fields.table, {
  while: [machine.states.seated],
  refuse: TableTaken,
});
