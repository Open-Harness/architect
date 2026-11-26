// `--only`: which journeys a run is narrowed to. A journey is named by its declared name ("claim a handle") or by its file as
// `ortho brief` and `ortho model` list it (journeys/claim-a-handle.ts), so a builder can paste either.
import type { Project } from "#modules/journeys/types.js";

/** A file as the project lists it: no leading `./`, forward slashes. */
const fileOf = (said: string) => said.replace(/\\/g, "/").replace(/^\.\//, "");

const names = (project: Project, index: number, said: string) =>
  project.journeys[index]?.name === said || (project.journeyFiles?.[index] !== undefined && project.journeyFiles[index] === fileOf(said));

/** The first of `only` that is no journey's name and no journey's file. */
export const unknownOf = (project: Project, only: ReadonlyArray<string>): string | undefined =>
  only.find((said) => !project.journeys.some((_, index) => names(project, index, said)));

/** The project with only the journeys `only` names, in file order, each once; its files kept in step with them. */
export const chosen = (project: Project, only: ReadonlyArray<string>): Project => {
  const keep = project.journeys.flatMap((_, index) => (only.some((said) => names(project, index, said)) ? [index] : []));
  return { ...project, journeys: keep.map((i) => project.journeys[i]!), ...(project.journeyFiles === undefined ? {} : { journeyFiles: keep.map((i) => project.journeyFiles![i]!) }) };
};

/** What prove says when `--only` names nothing: the name it was given, and the two ways to name one. */
export const noJourney = (said: string) => `no journey named "${said}": name one by its declared name or by its file, as ortho model lists them`;
