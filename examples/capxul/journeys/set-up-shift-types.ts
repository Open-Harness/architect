// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// The order of refusals: ShiftStartsWhenItEnds is the handler's, before the insert; ShiftTypeNameTaken is the rule's, at commit.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { ShiftTypeCreated } from "../blueprint/things/shift-type/events.ts";
import { ShiftStartsWhenItEnds, ShiftTypeNameTaken } from "../blueprint/things/shift-type/errors.ts";
import { machine as shifts } from "../blueprint/things/shift-type/machine.ts";
import create from "../blueprint/things/shift-type/verbs/create.ts";
import get from "../blueprint/things/shift-type/verbs/get.ts";

export default Blueprint.journey("set up shift types", {
  // Ada runs Acme Trading and Acme Logistics; Bo runs Bo Ltd.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "three companies",
  steps: (s) => [
    s.step(
      "Ada adds a day shift, nine to five",
      s.ada.run(create, { company: s.world.company, shiftTypeName: "Day", startTime: "09:00", endTime: "17:00" }),
      expect((a) => a.shiftType).toMatch(/^sht_[0-9a-z]+$/),
      emits(ShiftTypeCreated, { shiftType: s.last.shiftType, company: s.world.company }),
      shifts.isIn(s.last.shiftType, "active"),
      spans({ present: ["shift-type.create", "shift-type.create.insert"] }),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(get, { id: s.last.shiftType }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "it reads back as she typed it",
      s.ada.run(get, { id: s.last.shiftType }),
      expect((a) => [a.company, a.shiftTypeName, a.startTime, a.endTime, a.state]).toEqual([
        s.world.company,
        "Day",
        "09:00",
        "17:00",
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "a night shift may end the morning after it starts",
      s.ada.run(create, { company: s.world.company, shiftTypeName: "Night", startTime: "22:00", endTime: "06:00" }),
      expect((a) => a.shiftType).toMatch(/^sht_[0-9a-z]+$/),
      emits(ShiftTypeCreated, { shiftType: s.last.shiftType, company: s.world.company }),
    ),
    s.step(
      "it reads back starting at ten and ending at six",
      s.ada.run(get, { id: s.last.shiftType }),
      expect((a) => [a.company, a.shiftTypeName, a.startTime, a.endTime, a.state]).toEqual([
        s.world.company,
        "Night",
        "22:00",
        "06:00",
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "a shift can't start when it ends",
      s.ada.run(create, { company: s.world.company, shiftTypeName: "Nothing", startTime: "08:00", endTime: "08:00" }),
      refuses(ShiftStartsWhenItEnds),
      noEvents(),
      spans({ absent: ["shift-type.create.insert"] }),
    ),
    s.step(
      "nor at midnight, when it ends at midnight",
      s.ada.run(create, { company: s.world.company, shiftTypeName: "Midnight", startTime: "00:00", endTime: "00:00" }),
      refuses(ShiftStartsWhenItEnds),
      noEvents(),
    ),
    s.step(
      "a name already taken, with the same start and end, is refused for its times first",
      s.ada.run(create, { company: s.world.company, shiftTypeName: "Day", startTime: "07:30", endTime: "07:30" }),
      refuses(ShiftStartsWhenItEnds),
      noEvents(),
    ),
    s.step(
      "a shift one minute long is allowed",
      s.ada.run(create, { company: s.world.company, shiftTypeName: "Handover", startTime: "08:00", endTime: "08:01" }),
      expect((a) => a.shiftType).toMatch(/^sht_[0-9a-z]+$/),
    ),
    s.step(
      "it reads back a minute long",
      s.ada.run(get, { id: s.last.shiftType }),
      expect((a) => [a.shiftTypeName, a.startTime, a.endTime]).toEqual(["Handover", "08:00", "08:01"]),
      noEvents(),
    ),
    s.step(
      "a shift exactly twelve hours long is allowed, eight in the morning to eight at night",
      s.ada.run(create, { company: s.world.company, shiftTypeName: "Twelve", startTime: "08:00", endTime: "20:00" }),
      expect((a) => a.shiftType).toMatch(/^sht_[0-9a-z]+$/),
    ),
    s.step(
      "it reads back twelve hours long",
      s.ada.run(get, { id: s.last.shiftType }),
      expect((a) => [a.shiftTypeName, a.startTime, a.endTime]).toEqual(["Twelve", "08:00", "20:00"]),
      noEvents(),
    ),
    s.step(
      "Day can't be added to Acme Trading twice",
      s.ada.run(create, { company: s.world.company, shiftTypeName: "Day", startTime: "08:00", endTime: "16:00" }),
      refuses(ShiftTypeNameTaken, { shiftTypeName: "Day" }),
      noEvents(),
    ),
    s.step(
      "Bo can't add a shift to Ada's company",
      s.bo.run(create, { company: s.world.company, shiftTypeName: "Early", startTime: "06:00", endTime: "14:00" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["shift-type.create", "shift-type.create.insert"] }),
    ),
    s.step(
      "Acme Logistics may have a Day shift of its own, with other times",
      s.ada.run(create, { company: s.world.otherCompany, shiftTypeName: "Day", startTime: "08:00", endTime: "16:30" }),
      expect((a) => a.shiftType).toMatch(/^sht_[0-9a-z]+$/),
      emits(ShiftTypeCreated, { shiftType: s.last.shiftType, company: s.world.otherCompany }),
    ),
    s.step(
      "it reads back in Acme Logistics with its own times",
      s.ada.run(get, { id: s.last.shiftType }),
      expect((a) => [a.company, a.shiftTypeName, a.startTime, a.endTime, a.state]).toEqual([
        s.world.otherCompany,
        "Day",
        "08:00",
        "16:30",
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "Bo adds a Day shift to Bo Ltd",
      s.bo.run(create, { company: s.world.boCompany, shiftTypeName: "Day", startTime: "09:00", endTime: "17:00" }),
      expect((a) => a.shiftType).toMatch(/^sht_[0-9a-z]+$/),
      emits(ShiftTypeCreated, { shiftType: s.last.shiftType, company: s.world.boCompany }),
    ),
    s.step(
      "it reads back in Bo Ltd",
      s.bo.run(get, { id: s.last.shiftType }),
      expect((a) => [a.company, a.shiftTypeName, a.startTime, a.endTime]).toEqual([s.world.boCompany, "Day", "09:00", "17:00"]),
      noEvents(),
    ),
  ],
});
