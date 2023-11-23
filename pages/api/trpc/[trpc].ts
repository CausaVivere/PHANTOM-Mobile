import { createNextApiHandler } from "@trpc/server/adapters/next";
import { env } from "env.mjs";
import { createTRPCContext } from "~/server/api/trpc";
import { AppRouter, appRouter } from "~/server/api/root";
import { createContext } from "~/server/api/context";
import * as trpcNext from "@trpc/server/adapters/next";

// export API handler
export default trpcNext.createNextApiHandler<AppRouter>({
  router: appRouter,
  createContext,
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
          );
        }
      : undefined,
  batching: {
    enabled: true,
  },
});
