import { Blueprint } from "orthograph";
import { Schema } from "effect";
import { Appraisal } from "../things/appraisal/thing.ts";

/** The appraisals a cycle's start made, in the order their appraisees are listed. */
export const AppraisalIds = Blueprint.value(Schema.Array(Appraisal.fields.id.value.schema).check(Schema.isMaxLength(50)));
