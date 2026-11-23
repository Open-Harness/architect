// Generated from blueprint/things/handle/verbs/release.ts. Do not edit.
"use client";
import { AlertDialog, AlertDialogBackdrop, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@ui-sdk/react/alert-dialog";
import { createParts } from "@ui-sdk/react/primitive";
import { useState } from "react";
import { options } from "../../actions/handle/release.ts";
import { usePieceHost } from "../react.tsx";
import { handleRelease, type HandleReleaseAnswer } from "./release.ts";

const parts = createParts(handleRelease, { root: "form", refusal: "p", answer: "output", submit: "button" });

type RootProps = Parameters<typeof parts.Root>[0];
type Done = { readonly onDone?: (answer: HandleReleaseAnswer) => void };
const Refusal = (props: Omit<Parameters<typeof parts.Refusal>[0], "children">) => <parts.Refusal {...props}>{(state) => state.text}</parts.Refusal>;
const Answer = (props: Omit<Parameters<typeof parts.Answer>[0], "children">) => <parts.Answer {...props}>{(state) => state.text}</parts.Answer>;

/** Free your name and take its public page offline. Anyone may claim the name afterwards. */
export const HandleRelease = {
  Root: (props: RootProps) => <parts.Root aria-label="Release handle" {...usePieceHost(options)} {...props} />,
  Refusal,
  Answer,
  Submit: parts.Submit,
  Confirm: (props: Done & { readonly handle: string; }) => {
    const [open, setOpen] = useState(false);
    return (
      <HandleRelease.Root {...props}>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger>Release handle</AlertDialogTrigger>
          <AlertDialogBackdrop />
          <AlertDialogContent>
            <AlertDialogTitle>Release handle?</AlertDialogTitle>
            <AlertDialogDescription>{"Free your name and take its public page offline. Anyone may claim the name afterwards."}</AlertDialogDescription>
            <AlertDialogClose>Keep it</AlertDialogClose>
            <parts.Submit data-agent-confirm={"Free your name and take its public page offline. Anyone may claim the name afterwards."} onClick={() => setOpen(false)}>Release</parts.Submit>
          </AlertDialogContent>
        </AlertDialog>
        <Refusal />
      </HandleRelease.Root>
    );
  },
};
