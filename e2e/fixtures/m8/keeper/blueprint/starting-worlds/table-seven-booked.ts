// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import book from "../things/booking/verbs/book.ts";

/** Aaron booked table 7 the moment the world started, at nine: the keeper seats it at ten. */
export default Blueprint.startingWorld("table-seven-booked", {
  cast: { aaron: Blueprint.anyone },
  makes: (s) => [s.aaron.run(book, { table: "7" })],
  gives: (s) => ({ first: s.last.booking }),
});
