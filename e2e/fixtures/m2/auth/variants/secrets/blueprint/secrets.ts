// M2.04: the auth stand-in declares its secret, as @orthograph/auth will (M2-auth, row 7). Mounted as `blueprint/features/auth.ts`
// its name in every environment is AUTH_SECRET; mounted as `identity.ts` it is IDENTITY_SECRET. Nobody types the name.
import { Blueprint } from "orthograph";

export const secret = Blueprint.secret.generated({ bytes: 32 });
