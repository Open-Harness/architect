import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { KraTitle } from "../../values/appraisals.ts";

// HRMS's KRA (hrms/hr/doctype/kra), a key result area: its title, which names it. HRMS's KRAs are site-wide; Capxul's
// are each company's, unique by title in it (`decisions/CX-appraisals.md`). Its description comes with optional fields.
export const Kra = Blueprint.thing({
  description: "A key result area a company appraises its people on.",
  code: "KR",
  fields: { id: Blueprint.id("kra"), company: Company.fields.id, title: KraTitle },
});
