// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// The world's clock starts at Tuesday 1 December 2026, 09:00 UTC (environments/local.ts). A promotion is submitted on
// or after its day, by the clock's day in UTC (HRMS's `before_submit`). Refusal order on create
// (employee-promotion/errors.ts): PromotedEmployeeNotInCompany, PromotedEmployeeHasLeft, NewDesignationNotInCompany,
// DesignationUnchanged. Cancelling puts back the job title the promotion replaced (HRMS's `on_cancel`).
// One prove run shares one clock that never goes back, and journeys run in file-name order: this one's days (7
// December) come after give-interview-feedback's (3 December) and before transfer-an-employee's (8 December).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeePromoted, EmployeePromotionCancelled, EmployeePromotionDrafted } from "../blueprint/things/employee-promotion/events.ts";
import {
  DesignationUnchanged,
  NewDesignationNotInCompany,
  PromotedEmployeeHasLeft,
  PromotedEmployeeNotInCompany,
  PromotionNotYetDue,
} from "../blueprint/things/employee-promotion/errors.ts";
import { machine as promotions } from "../blueprint/things/employee-promotion/machine.ts";
import create from "../blueprint/things/employee-promotion/verbs/create.ts";
import submit from "../blueprint/things/employee-promotion/verbs/submit.ts";
import cancel from "../blueprint/things/employee-promotion/verbs/cancel.ts";
import get from "../blueprint/things/employee-promotion/verbs/get.ts";
import getEmployee from "../blueprint/things/employee/verbs/get.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";

export default Blueprint.journey("promote an employee", {
  // Olga and Cy are engineers in Acme Trading's Engineering; Bo drives for Acme Logistics. Ada runs both companies and
  // has drafted Olga's promotion to Lead Engineer from Monday 7 December, and Cy's from Tuesday 1 December.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a second transfer",
  steps: (s) => [
    s.step(
      "Olga's promotion reads back a draft, from Engineer to Lead Engineer, from 7 December",
      s.ada.run(get, { id: s.world.employeePromotion }),
      expect((a) => [a.company, a.employee, a.promotionDate, a.currentDesignation, a.newDesignation, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-12-07",
        s.world.designation,
        s.world.otherDesignation,
        "draft",
      ]),
      noEvents(),
    ),
    s.step(
      "Olga reads her own",
      s.olga.run(get, { id: s.world.employeePromotion }),
      expect((a) => [a.employee, a.currentDesignation, a.newDesignation, a.state]).toEqual([
        s.world.employee,
        s.world.designation,
        s.world.otherDesignation,
        "draft",
      ]),
      noEvents(),
    ),
    s.step("Cy can't read Olga's", s.cy.run(get, { id: s.world.employeePromotion }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("nor can Bo", s.bo.run(get, { id: s.world.employeePromotion }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Bo can't draft a promotion in Acme Trading",
      s.bo.run(create, { company: s.world.company, employee: s.world.secondEmployee, promotionDate: "2026-12-01", newDesignation: s.world.otherDesignation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["employee-promotion.create", "employee-promotion.create.insert"] }),
    ),
    s.step(
      "Ada can't submit Olga's before its day",
      s.ada.run(submit, { employeePromotion: s.world.employeePromotion }),
      refuses(PromotionNotYetDue, { promotionDate: "2026-12-07" }),
      noEvents(),
      spans({ absent: ["employee-promotion.submit.update"] }),
    ),
    s.step("Bo can't submit it", s.bo.run(submit, { employeePromotion: s.world.employeePromotion }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("nor can Olga submit her own", s.olga.run(submit, { employeePromotion: s.world.employeePromotion }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Ada can't cancel it while it is a draft",
      s.ada.run(cancel, { employeePromotion: s.world.employeePromotion }),
      refuses(promotions.notFrom, { state: "draft" }),
      noEvents(),
    ),
    s.step(
      "the clock reaches a second before midnight on the eve of its day",
      s.clock.moveTo("2026-12-06T23:59:59Z"),
      expect((a) => a.now).toBe("2026-12-06T23:59:59.000Z"),
    ),
    s.step(
      "Ada still can't submit it",
      s.ada.run(submit, { employeePromotion: s.world.employeePromotion }),
      refuses(PromotionNotYetDue, { promotionDate: "2026-12-07" }),
      noEvents(),
    ),
    s.step("Olga still reads back an engineer", s.olga.run(getEmployee, { id: s.world.employee }), expect((a) => a.designation).toBe(s.world.designation), noEvents()),
    s.step(
      "the clock reaches midnight on its day",
      s.clock.moveTo("2026-12-07T00:00:00Z"),
      expect((a) => a.now).toBe("2026-12-07T00:00:00.000Z"),
    ),
    s.step(
      "Ada submits it on the day itself",
      s.ada.run(submit, { employeePromotion: s.world.employeePromotion }),
      expect((a) => [a.employeePromotion, a.employee, a.designation]).toEqual([s.world.employeePromotion, s.world.employee, s.world.otherDesignation]),
      emits(EmployeePromoted, { employeePromotion: s.world.employeePromotion, employee: s.world.employee, designation: s.world.otherDesignation }),
      promotions.isIn(s.world.employeePromotion, "submitted"),
      spans({ present: ["employee-promotion.submit", "employee-promotion.submit.update"] }),
    ),
    s.step(
      "Olga reads herself back a lead engineer, still in Engineering at Acme Trading",
      s.olga.run(getEmployee, { id: s.world.employee }),
      expect((a) => [a.company, a.department, a.designation, a.state]).toEqual([s.world.company, s.world.department, s.world.otherDesignation, "active"]),
      noEvents(),
    ),
    s.step(
      "Ada can't submit it twice",
      s.ada.run(submit, { employeePromotion: s.world.employeePromotion }),
      refuses(promotions.notFrom, { state: "submitted" }),
      noEvents(),
    ),
    s.step(
      "Ada can't draft Olga's promotion to Lead Engineer again, the title she now holds",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, promotionDate: "2026-12-14", newDesignation: s.world.otherDesignation }),
      refuses(DesignationUnchanged),
      noEvents(),
      spans({ absent: ["employee-promotion.create.insert"] }),
    ),
    s.step(
      "but she may draft one back to Engineer",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, promotionDate: "2026-12-14", newDesignation: s.world.designation }),
      expect((a) => a.employeePromotion).toMatch(/^epr_[0-9a-z]+$/),
      emits(EmployeePromotionDrafted, { employeePromotion: s.last.employeePromotion, employee: s.world.employee }),
      promotions.isIn(s.last.employeePromotion, "draft"),
      spans({ present: ["employee-promotion.create", "employee-promotion.create.load", "employee-promotion.create.insert"] }),
    ),
    s.step(
      "it copied the title she holds now, Lead Engineer",
      s.ada.run(get, { id: s.last.employeePromotion }),
      expect((a) => [a.company, a.employee, a.promotionDate, a.currentDesignation, a.newDesignation, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-12-14",
        s.world.otherDesignation,
        s.world.designation,
        "draft",
      ]),
      noEvents(),
    ),
    s.step(
      "beside that draft, Ada may draft another back to Engineer from 2 December, a day already past",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, promotionDate: "2026-12-02", newDesignation: s.world.designation }),
      expect((a) => a.employeePromotion).toMatch(/^epr_[0-9a-z]+$/),
      emits(EmployeePromotionDrafted, { employeePromotion: s.last.employeePromotion, employee: s.world.employee }),
      promotions.isIn(s.last.employeePromotion, "draft"),
    ),
    s.step(
      "and submit it at once, as its day has come",
      s.ada.run(submit, { employeePromotion: s.last.employeePromotion }),
      expect((a) => [a.employee, a.designation]).toEqual([s.world.employee, s.world.designation]),
      emits(EmployeePromoted, { employeePromotion: s.last.employeePromotion, employee: s.world.employee, designation: s.world.designation }),
      promotions.isIn(s.last.employeePromotion, "submitted"),
    ),
    s.step(
      "Olga reads her title back as Engineer again",
      s.olga.run(getEmployee, { id: s.world.employee }),
      expect((a) => a.designation).toBe(s.world.designation),
      noEvents(),
    ),
    s.step("Bo can't cancel Olga's first", s.bo.run(cancel, { employeePromotion: s.world.employeePromotion }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("nor can Olga", s.olga.run(cancel, { employeePromotion: s.world.employeePromotion }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("nor Cy", s.cy.run(cancel, { employeePromotion: s.world.employeePromotion }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Ada cancels it, putting back Engineer",
      s.ada.run(cancel, { employeePromotion: s.world.employeePromotion }),
      expect((a) => [a.employeePromotion, a.employee, a.designation]).toEqual([s.world.employeePromotion, s.world.employee, s.world.designation]),
      emits(EmployeePromotionCancelled, { employeePromotion: s.world.employeePromotion, employee: s.world.employee, designation: s.world.designation }),
      promotions.isIn(s.world.employeePromotion, "cancelled"),
      spans({ present: ["employee-promotion.cancel", "employee-promotion.cancel.update"] }),
    ),
    s.step(
      "Olga reads herself back an engineer again, still in Engineering",
      s.olga.run(getEmployee, { id: s.world.employee }),
      expect((a) => [a.company, a.department, a.designation, a.state]).toEqual([s.world.company, s.world.department, s.world.designation, "active"]),
      noEvents(),
    ),
    s.step(
      "the promotion reads back cancelled, its titles kept",
      s.ada.run(get, { id: s.world.employeePromotion }),
      expect((a) => [a.currentDesignation, a.newDesignation, a.state]).toEqual([s.world.designation, s.world.otherDesignation, "cancelled"]),
      noEvents(),
    ),
    s.step("Ada can't cancel it twice", s.ada.run(cancel, { employeePromotion: s.world.employeePromotion }), refuses(promotions.notFrom, { state: "cancelled" }), noEvents()),
    s.step("nor submit it again", s.ada.run(submit, { employeePromotion: s.world.employeePromotion }), refuses(promotions.notFrom, { state: "cancelled" }), noEvents()),
    s.step(
      "Ada can't draft Olga's promotion to Engineer, the title she holds",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, promotionDate: "2026-12-14", newDesignation: s.world.designation }),
      refuses(DesignationUnchanged),
      noEvents(),
    ),
    s.step(
      "Ada can't promote Bo in Acme Trading, where he doesn't work",
      s.ada.run(create, { company: s.world.company, employee: s.world.outsider, promotionDate: "2026-12-14", newDesignation: s.world.otherDesignation }),
      refuses(PromotedEmployeeNotInCompany),
      noEvents(),
      spans({ absent: ["employee-promotion.create.insert"] }),
    ),
    s.step(
      "nor give Bo, at Acme Logistics, one of Acme Trading's titles",
      s.ada.run(create, { company: s.world.otherCompany, employee: s.world.outsider, promotionDate: "2026-12-14", newDesignation: s.world.otherDesignation }),
      refuses(NewDesignationNotInCompany),
      noEvents(),
      spans({ absent: ["employee-promotion.create.insert"] }),
    ),
    s.step(
      "Olga in Acme Logistics is refused for the employee's company, which is judged before the title's",
      s.ada.run(create, { company: s.world.otherCompany, employee: s.world.employee, promotionDate: "2026-12-14", newDesignation: s.world.otherDesignation }),
      refuses(PromotedEmployeeNotInCompany),
      noEvents(),
    ),
    s.step(
      "Ada relieves Bo on 30 November",
      s.ada.run(relieve, { employee: s.world.outsider, relievingDate: "2026-11-30" }),
      expect((a) => a.employee).toBe(s.world.outsider),
    ),
    s.step(
      "Ada can't promote Bo now he has left, which is judged before the title's company",
      s.ada.run(create, { company: s.world.otherCompany, employee: s.world.outsider, promotionDate: "2026-12-14", newDesignation: s.world.otherDesignation }),
      refuses(PromotedEmployeeHasLeft),
      noEvents(),
      spans({ absent: ["employee-promotion.create.insert"] }),
    ),
    s.step(
      "in Acme Trading he is refused for the company first",
      s.ada.run(create, { company: s.world.company, employee: s.world.outsider, promotionDate: "2026-12-14", newDesignation: s.world.otherDesignation }),
      refuses(PromotedEmployeeNotInCompany),
      noEvents(),
    ),
    s.step(
      "Ada relieves Cy on 30 November",
      s.ada.run(relieve, { employee: s.world.secondEmployee, relievingDate: "2026-11-30" }),
      expect((a) => a.employee).toBe(s.world.secondEmployee),
    ),
    s.step(
      "Ada still submits Cy's promotion, drafted before she left",
      s.ada.run(submit, { employeePromotion: s.world.secondPromotion }),
      expect((a) => [a.employeePromotion, a.employee, a.designation]).toEqual([s.world.secondPromotion, s.world.secondEmployee, s.world.otherDesignation]),
      emits(EmployeePromoted, { employeePromotion: s.world.secondPromotion, employee: s.world.secondEmployee, designation: s.world.otherDesignation }),
      promotions.isIn(s.world.secondPromotion, "submitted"),
    ),
    s.step(
      "Cy reads herself back a lead engineer who has left",
      s.cy.run(getEmployee, { id: s.world.secondEmployee }),
      expect((a) => [a.department, a.designation, a.state]).toEqual([s.world.department, s.world.otherDesignation, "left"]),
      noEvents(),
    ),
    s.step(
      "Ada can't draft a new one for Cy now she has left, which is judged before the title she holds",
      s.ada.run(create, { company: s.world.company, employee: s.world.secondEmployee, promotionDate: "2026-12-14", newDesignation: s.world.otherDesignation }),
      refuses(PromotedEmployeeHasLeft),
      noEvents(),
    ),
    s.step(
      "Ada still cancels Cy's, drafted before she left, putting back Engineer",
      s.ada.run(cancel, { employeePromotion: s.world.secondPromotion }),
      expect((a) => [a.employeePromotion, a.employee, a.designation]).toEqual([s.world.secondPromotion, s.world.secondEmployee, s.world.designation]),
      emits(EmployeePromotionCancelled, { employeePromotion: s.world.secondPromotion, employee: s.world.secondEmployee, designation: s.world.designation }),
      promotions.isIn(s.world.secondPromotion, "cancelled"),
    ),
    s.step(
      "Cy reads her title back as Engineer, and has still left",
      s.cy.run(getEmployee, { id: s.world.secondEmployee }),
      expect((a) => [a.designation, a.state]).toEqual([s.world.designation, "left"]),
      noEvents(),
    ),
  ],
});
