// Generated from blueprint/projections/web.ts. Do not edit.
"use client";
import { createContext, useContext } from "react";
import { WebHost, type ActionFactory, type PieceWiring } from "@orthograph/web";

const HostContext = createContext<WebHost | null>(null);

/** Wrap the app once: `<PluggedInHost value={WebHost.make({ client: PluggedIn.layer({ url }), ask })}>`. */
export const PluggedInHost = HostContext;

const hostOf = () => useContext(HostContext) ?? WebHost.missing;

/** What a piece's root takes: the host and the callback that sends this action. */
export const usePieceHost = <Answer,>(options: ActionFactory<any, Answer>): PieceWiring<Answer> => hostOf().wire(options);

/** An action of the app, for a page's own component: approval is asked of the host's person, and a write tells the reads it concerns. */
export const useAction = <Args, Answer>(options: ActionFactory<Args, Answer>) => hostOf().action(options);
