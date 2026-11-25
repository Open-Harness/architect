// Scaffolded from blueprint/things/appraisal-template/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal-template/create.handler.ts";

const { TemplateWithoutKras, TemplateKraNotInCompany, TemplateCriteriaNotInCompany, TemplateLineRepeated, TemplateWeightageOutOfRange, KraWeightageNotHundred, CriteriaWeightageNotHundred } = Errors.declared;

/**
 * appraisal-template.create: Make an appraisal template: KRAs and rating criteria, each with its weightage.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal-template/verbs/create.ts:
 *   company   appraisal-template.company
 *   title     appraisal-template.title
 *   kras      appraisal-template.kras
 *   criteria  appraisal-template.criteria
 *
 * Answer, from blueprint/things/appraisal-template/verbs/create.ts:
 *   appraisalTemplate  appraisal-template.id
 *
 * Refusals:
 *   TemplateWithoutKras           exit 41   TP-001  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateKraNotInCompany       exit 42   TP-002  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateCriteriaNotInCompany  exit 43   TP-003  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateLineRepeated          exit 44   TP-004  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateWeightageOutOfRange   exit 45   TP-005  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   KraWeightageNotHundred        exit 46   TP-006  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   CriteriaWeightageNotHundred   exit 47   TP-007  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateTitleTaken            exit 48   TP-008  the runtime's: another appraisal template holds this company and title (appraisal-template.oneTitlePerCompany); from blueprint/things/appraisal-template/invariants.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal-template/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/appraisal-template/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal-template/verbs/create.ts: p95 200ms.
 *
 * The appraisal-template's machine, from blueprint/things/appraisal-template/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  AppraisalTemplateCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the appraisal-template's new id and hands it in as id;
 *   each step is its own span: appraisal-template.create.load, appraisal-template.create.insert;
 *   once it answers, it sets the appraisal-template's state to active;
 *   once it answers, it writes AppraisalTemplateCreated: appraisalTemplate from the answer, company from the payload;
 *   the call is the span appraisal-template.create, and its commit appraisal-template.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span appraisal-template.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // TemplateWithoutKras: exit 41, TP-001.
    if (yield* Handlers.blank<boolean>("refuse TemplateWithoutKras when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why TemplateWithoutKras was refused"));
      return yield* new TemplateWithoutKras({});
    }

    // TemplateKraNotInCompany: exit 42, TP-002.
    if (yield* Handlers.blank<boolean>("refuse TemplateKraNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why TemplateKraNotInCompany was refused"));
      return yield* new TemplateKraNotInCompany({});
    }

    // TemplateCriteriaNotInCompany: exit 43, TP-003.
    if (yield* Handlers.blank<boolean>("refuse TemplateCriteriaNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why TemplateCriteriaNotInCompany was refused"));
      return yield* new TemplateCriteriaNotInCompany({});
    }

    // TemplateLineRepeated: exit 44, TP-004.
    if (yield* Handlers.blank<boolean>("refuse TemplateLineRepeated when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why TemplateLineRepeated was refused"));
      return yield* new TemplateLineRepeated({});
    }

    // TemplateWeightageOutOfRange: exit 45, TP-005.
    if (yield* Handlers.blank<boolean>("refuse TemplateWeightageOutOfRange when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why TemplateWeightageOutOfRange was refused"));
      return yield* new TemplateWeightageOutOfRange({});
    }

    // KraWeightageNotHundred: exit 46, TP-006.
    if (yield* Handlers.blank<boolean>("refuse KraWeightageNotHundred when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why KraWeightageNotHundred was refused"));
      return yield* new KraWeightageNotHundred({});
    }

    // CriteriaWeightageNotHundred: exit 47, TP-007.
    if (yield* Handlers.blank<boolean>("refuse CriteriaWeightageNotHundred when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why CriteriaWeightageNotHundred was refused"));
      return yield* new CriteriaWeightageNotHundred({});
    }

    // Step insert: database, span appraisal-template.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // AppraisalTemplateCreated needs appraisalTemplate, and only the answer can give it.
      appraisalTemplate: id,
    };
  });

export default create;
