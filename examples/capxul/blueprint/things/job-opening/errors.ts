import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** Capxul's own rule (`decisions/CX-recruitment.md`): an opening hires at least one person. HRMS leaves `vacancies` optional. */
export class OpeningWithoutVacancies extends Blueprint.error({}, { exit: 41 }) {}
