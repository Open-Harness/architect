import { Blueprint } from "orthograph";
import { Profile } from "./thing.ts";

export const ProfileMade = Blueprint.event({ profile: Profile.fields.id });
