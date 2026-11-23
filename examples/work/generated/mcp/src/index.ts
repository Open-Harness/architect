// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as attentionApprove } from "../../api/src/attention/approve.ts";
import { declaration as attentionDecline } from "../../api/src/attention/decline.ts";
import { declaration as attentionList } from "../../api/src/attention/list.ts";
import { declaration as attentionRaise } from "../../api/src/attention/raise.ts";
import { declaration as milestoneAdd } from "../../api/src/milestone/add.ts";
import { declaration as milestoneDrop } from "../../api/src/milestone/drop.ts";
import { declaration as milestoneList } from "../../api/src/milestone/list.ts";
import { declaration as missionFinish } from "../../api/src/mission/finish.ts";
import { declaration as missionGet } from "../../api/src/mission/get.ts";
import { declaration as missionList } from "../../api/src/mission/list.ts";
import { declaration as missionOpen } from "../../api/src/mission/open.ts";
import { declaration as missionPause } from "../../api/src/mission/pause.ts";
import { declaration as missionResume } from "../../api/src/mission/resume.ts";
import { declaration as missionStart } from "../../api/src/mission/start.ts";
import { declaration as missionStop } from "../../api/src/mission/stop.ts";
import { declaration as missionTasks } from "../../api/src/mission/tasks.ts";
import { declaration as questionAnswer } from "../../api/src/question/answer.ts";
import { declaration as questionAsk } from "../../api/src/question/ask.ts";
import { declaration as questionList } from "../../api/src/question/list.ts";
import { declaration as questionSpike } from "../../api/src/question/spike.ts";
import { declaration as runFail } from "../../api/src/run/fail.ts";
import { declaration as runFinish } from "../../api/src/run/finish.ts";
import { declaration as runList } from "../../api/src/run/list.ts";
import { declaration as runReport } from "../../api/src/run/report.ts";
import { declaration as runStart } from "../../api/src/run/start.ts";
import { declaration as runStop } from "../../api/src/run/stop.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "attention.approve": { description: "Say yes. For a promote, the promote runs.", operation: attentionApprove, states: ["open","approved","declined"], move: {"key":"approve","from":["open"],"to":["approved"],"emits":"AttentionApproved"} },
  "attention.decline": { description: "Say not yet, and why. The task stays where its facts put it.", operation: attentionDecline, states: ["open","approved","declined"], move: {"key":"decline","from":["open"],"to":["declined"],"emits":"AttentionDeclined"} },
  "attention.list": { description: "List attentions, newest first, 50 to a page, filtered by mission, state.", operation: attentionList, states: ["open","approved","declined"] },
  "attention.raise": { description: "Ask the mission's owner for a decision only they can make.", operation: attentionRaise, states: ["open","approved","declined"], move: {"key":"raise","from":[],"to":["open"],"emits":"AttentionRaised"} },
  "milestone.add": { description: "Add a milestone to a mission. Its tasks appear at once: its kinds over its subject.", operation: milestoneAdd, states: ["active","dropped"], move: {"key":"add","from":[],"to":["active"],"emits":"MilestoneAdded"} },
  "milestone.drop": { description: "Drop a milestone from its mission's scope. Its tasks leave the board; the burn-down shows the step.", operation: milestoneDrop, states: ["active","dropped"], move: {"key":"drop","from":["active"],"to":["dropped"],"emits":"MilestoneDropped"} },
  "milestone.list": { description: "List milestones, oldest first, 50 to a page, filtered by mission, state.", operation: milestoneList, states: ["active","dropped"] },
  "mission.finish": { description: "Close the mission: every task is closed by a fact up to its target.", operation: missionFinish, states: ["intake","running","paused","done","stopped"], move: {"key":"finish","from":["running"],"to":["done"],"emits":"MissionFinished"} },
  "mission.get": { description: "Read one mission by its id: owner, title, target, blueprint, state.", operation: missionGet, states: ["intake","running","paused","done","stopped"] },
  "mission.list": { description: "List missions, newest first, 20 to a page, filtered by owner, state.", operation: missionList, states: ["intake","running","paused","done","stopped"] },
  "mission.open": { description: "Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps.", operation: missionOpen, states: ["intake","running","paused","done","stopped"], move: {"key":"open","from":[],"to":["intake"],"emits":"MissionOpened"} },
  "mission.pause": { description: "Pause the mission, saying why.", operation: missionPause, states: ["intake","running","paused","done","stopped"], move: {"key":"pause","from":["running"],"to":["paused"],"emits":"MissionPaused"} },
  "mission.resume": { description: "Pick a paused mission up again.", operation: missionResume, states: ["intake","running","paused","done","stopped"], move: {"key":"resume","from":["paused"],"to":["running"],"emits":"MissionResumed"} },
  "mission.start": { description: "Start the mission once intake is done. From here the manager only orchestrates.", operation: missionStart, states: ["intake","running","paused","done","stopped"], move: {"key":"start","from":["intake"],"to":["running"],"emits":"MissionStarted"} },
  "mission.stop": { description: "Stop the mission for good. Its runs are stopped with it.", operation: missionStop, states: ["intake","running","paused","done","stopped"], move: {"key":"stop","from":["intake","running","paused"],"to":["stopped"],"emits":"MissionStopped"} },
  "mission.tasks": { description: "The mission's tasks, each in the column its facts put it in.", operation: missionTasks, states: ["intake","running","paused","done","stopped"] },
  "question.answer": { description: "Answer a question with one of its letters.", operation: questionAnswer, states: ["asked","answered","spiked"], move: {"key":"answer","from":["asked"],"to":["answered"],"emits":"QuestionAnswered"} },
  "question.ask": { description: "Ask the mission's owner about one gap in the blueprint, with lettered answers.", operation: questionAsk, states: ["asked","answered","spiked"], move: {"key":"ask","from":[],"to":["asked"],"emits":"QuestionAsked"} },
  "question.list": { description: "List questions, oldest first, 50 to a page, filtered by mission, state.", operation: questionList, states: ["asked","answered","spiked"] },
  "question.spike": { description: "Not sure yet: turn the question into a spike task on its subject.", operation: questionSpike, states: ["asked","answered","spiked"], move: {"key":"spike","from":["asked"],"to":["spiked"],"emits":"QuestionSpiked"} },
  "run.fail": { description: "The run gave up, saying why.", operation: runFail, states: ["running","waiting","finished","failed","stopped"], move: {"key":"fail","from":["running","waiting"],"to":["failed"],"emits":"RunFailed"} },
  "run.finish": { description: "The run pushed its branch. CI proves it; the run cannot close its own task.", operation: runFinish, states: ["running","waiting","finished","failed","stopped"], move: {"key":"finish","from":["running"],"to":["finished"],"emits":"RunFinished"} },
  "run.list": { description: "List runs, newest first, 50 to a page, filtered by mission, task, state.", operation: runList, states: ["running","waiting","finished","failed","stopped"] },
  "run.report": { description: "Say how the run is going. It moves no card.", operation: runReport, states: ["running","waiting","finished","failed","stopped"], move: {"key":"report","from":["running","waiting"],"to":["running","waiting"],"emits":"RunReported"} },
  "run.start": { description: "Start an agent on one task. The run claims the task until it ends.", operation: runStart, states: ["running","waiting","finished","failed","stopped"], move: {"key":"start","from":[],"to":["running"],"emits":"RunStarted"} },
  "run.stop": { description: "Stop the run. A person's act, or the mission stopping.", operation: runStop, states: ["running","waiting","finished","failed","stopped"], move: {"key":"stop","from":["running","waiting"],"to":["stopped"],"emits":"RunStopped"} },
} as const satisfies { readonly [name: string]: McpEntry };
