import { Blueprint } from "orthograph";

/** Epoch milliseconds, as a whole number: the server's clock as `system.today` reads it. */
export const Millis = Blueprint.value(Blueprint.uint(64));
