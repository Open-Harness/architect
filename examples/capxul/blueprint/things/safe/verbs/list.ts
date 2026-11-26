import { Blueprint } from "orthograph";
import { Safe } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A company's Safes, oldest first, to the person who runs it. A read changes nothing, so it has no handler. A company
// has one Safe today (CX-safe, "What is not a thing"); this is how a journey sees that it has no second.
export default Blueprint.read(Safe, {
  where: ["company"],
  order: "oldest",
  page: 50,
  allowed: [owner.of("company")],
  budget: { p95: "80 millis" },
});
