// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import book from "../things/booking/verbs/book.ts";

/** Then Bea booked table 7 too, at half past nine: the keeper would seat hers at half past ten. */
export default Blueprint.startingWorld("table-seven-booked-twice", {
  from: "table-seven-booked",
  cast: { bea: Blueprint.anyone },
  makes: (s) => [s.clock.moveTo("2027-01-10T09:30:00Z"), s.bea.run(book, { table: "7" })],
  gives: (s) => ({ second: s.last.booking }),
});
