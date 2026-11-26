import { Blueprint } from "orthograph";
import { PersonalSafe } from "../thing.ts";

// Every person's Safe, oldest first, to the system alone: it is what matches money arriving on chain to a Safe Capxul
// keeps (S2), and how a journey sees that an open wrote one Safe for its person and none malformed. Narrowed by person
// when given. A read changes nothing, so it has no handler.
export default Blueprint.read(PersonalSafe, {
  where: ["person"],
  order: "oldest",
  page: 50,
  allowed: [Blueprint.system],
  budget: { p95: "80 millis" },
});
