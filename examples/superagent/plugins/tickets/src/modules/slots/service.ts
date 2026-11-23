import { RESERVE, type Slots } from "./types.ts";
import { personsFirst } from "./internal/line.ts";

export const slots: Slots = {
  line: personsFirst,
  seatFor: (size, held, why) => {
    for (let seat = 1n; seat <= size; seat++) if (!held.has(seat)) return seat;
    return why === "person" && !held.has(RESERVE) ? RESERVE : undefined;
  },
};
