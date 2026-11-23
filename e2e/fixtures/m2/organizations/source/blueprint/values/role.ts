import { Blueprint, Schema } from "orthograph";

/** A place in an organisation. */
export const Role = Blueprint.value(Schema.Literals(["owner", "member"]));
