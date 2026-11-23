// Generated from blueprint/things/profile/verbs/get.ts. Do not edit.
"use client";
import { createParts } from "@ui-sdk/react/primitive";
import { options } from "../../actions/profile/get.ts";
import { usePieceHost } from "../react.tsx";
import { profileGet, type ProfileGetAnswer } from "./get.ts";

const parts = createParts(profileGet, { root: "div", refusal: "p" });

type RootProps = Parameters<typeof parts.Root>[0];

/** Read a claimed name's public page and its links in display order. */
export const ProfileGet = {
  Root: (props: RootProps) => <parts.Root aria-label="Get profile" {...usePieceHost(options)} {...props} />,
  Refusal: (props: Omit<Parameters<typeof parts.Refusal>[0], "children">) => <parts.Refusal {...props}>{(state) => state.text}</parts.Refusal>,
};
