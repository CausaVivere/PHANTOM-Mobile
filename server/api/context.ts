import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import { NodeHTTPCreateContextFnOptions } from "@trpc/server/adapters/node-http";
import { IncomingMessage } from "http";
import { getSession } from "next-auth/react";
import ws from "ws";
import { prisma } from "../db";

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async (
  opts:
    | NodeHTTPCreateContextFnOptions<IncomingMessage, ws>
    | trpcNext.CreateNextContextOptions
) => {
  const session = await getSession(opts);

  console.log("createContext for", session?.user?.name ?? "unknown user");

  return {
    session,
    prisma,
  };
};

export type Context = trpc.inferAsyncReturnType<typeof createContext>;
