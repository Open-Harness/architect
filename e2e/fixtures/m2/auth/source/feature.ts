// The stand-in for @orthograph/auth (M2.05): the declarations and journeys the real package must carry, with every
// handler empty. Pure metadata, imported by the mount and by the compiler. `provides: { identity }` is M2.04's and
// M2.05's surface (M2-auth, fork 4), so the stand-in says nothing of it and compiles on today's framework.
import { Blueprint } from "orthograph";

export default Blueprint.feature({
  description: "People and sessions: who is calling.",
  needs: [],
});
