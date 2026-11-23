// The stand-in for @orthograph/wallets (M1.29): the declarations and journeys the real package must carry, with every
// handler empty. Pure metadata, imported by the mount and by the compiler.
import { Blueprint } from "orthograph";

export default Blueprint.feature({
  description: "Keys on a device or in a server's key store: make, import, list, sign and send.",
  needs: [],
});
