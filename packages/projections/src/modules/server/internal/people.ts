import type { Model } from "@orthograph/compiler";
import { camel } from "#modules/names/service.js";

/**
 * Where the identity keeps its users: Better Auth's table, today the identity behind `AuthD1`. Named here, in what the
 * generated server says, never in host code; the identity plugin (M2.05) will own it.
 */
const IDENTITY_USERS = "auth_user";
/**
 * The thing the identity keeps, bound explicitly: the identity's users are what a `Principal` calls a `person`, so its
 * thing is the one named `person` (K16 review, 22.1). Never found by its id prefix: an app thing may use `per_` too.
 */
const IDENTITY_THING = "person";
export const peopleOf = (model: Model) => {
  const people = model.things[IDENTITY_THING];
  return people ? `, people: { thing: thingIn(${camel(people.name)}Thing), table: "${IDENTITY_USERS}" }` : "";
};
