import { Blueprint } from "orthograph";
import { Source } from "./thing.ts";

export const SourceSaved = Blueprint.event({ source: Source.fields.id, superagent: Source.fields.superagent });
export const SourceEnabled = Blueprint.event({ source: Source.fields.id });
export const SourceDisabled = Blueprint.event({ source: Source.fields.id });
export const SourcePositionAdvanced = Blueprint.event({ source: Source.fields.id, position: Source.fields.position });
export const SourceFailed = Blueprint.event({ source: Source.fields.id });
