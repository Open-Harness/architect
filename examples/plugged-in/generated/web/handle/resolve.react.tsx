// Generated from blueprint/things/handle/verbs/resolve.ts. Do not edit.
"use client";
import { createParts } from "@ui-sdk/react/primitive";
import { options } from "../../actions/handle/resolve.ts";
import { usePieceHost } from "../react.tsx";
import { handleResolve, type HandleResolveAnswer } from "./resolve.ts";

const parts = createParts(handleResolve, { root: "div", refusal: "p" });

type RootProps = Parameters<typeof parts.Root>[0];

/** Find the handle that holds a claimed name. A released or unclaimed name has none. */
export const HandleResolve = {
  Root: (props: RootProps) => <parts.Root aria-label="Resolve handle" {...usePieceHost(options)} {...props} />,
  Refusal: (props: Omit<Parameters<typeof parts.Refusal>[0], "children">) => <parts.Refusal {...props}>{(state) => state.text}</parts.Refusal>,
};
