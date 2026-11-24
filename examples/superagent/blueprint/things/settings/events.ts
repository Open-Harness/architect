import { Blueprint } from "orthograph";
import { Settings } from "./thing.ts";

export const SettingsSaved = Blueprint.event({ settings: Settings.fields.id, revision: Settings.fields.revision });
