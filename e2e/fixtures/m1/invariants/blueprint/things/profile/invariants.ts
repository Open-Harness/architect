import { Blueprint } from "orthograph";
import { Profile } from "./thing.ts";

// A handle has one page. No caller can break it (only `profile.make` makes a profile, once), so it names no refusal: a break is the
// app's own bug, a defect naming the rule. It still gets its index and its `findBy`.
export const onePagePerHandle = Blueprint.invariant.unique(Profile.fields.handle);
