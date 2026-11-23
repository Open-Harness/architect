import { links } from "../generated/app/links.ts";

export const here = [links.home(), links.profile({ handle: "aaron" }), links.thing({ name: "handle" })];
