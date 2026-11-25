import { Blueprint } from "orthograph";
import { Schema } from "effect";
import { Employee } from "../things/employee/thing.ts";
import { AppraisalTemplate } from "../things/appraisal-template/thing.ts";

/**
 * A cycle's appraisees (HRMS's Appraisee rows): each employee once, with the template they are appraised by. HRMS fills
 * the rows from filters and a template per job title (`set_employees`); here the owner names them. At most fifty.
 */
export const Appraisees = Blueprint.value(
  Schema.Array(Schema.Struct({ employee: Employee.fields.id.value.schema, appraisalTemplate: AppraisalTemplate.fields.id.value.schema })).check(
    Schema.isMaxLength(50),
  ),
);
