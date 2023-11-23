import { createTRPCRouter } from "~/server/api/trpc";
import { exampleRouter } from "~/server/api/routers/example";
import { roomsRouter } from "~/server/api/routers/rooms";
import { agendaRouter } from "./routers/agenda";
import { chatRouter } from "./routers/chat";
import { useRouter } from "next/router";
import { userRouter } from "./routers/user";
import { groupRouter } from "./routers/group";
import { tasksRouter } from "./routers/tasks";
import admin from "firebase-admin";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */

export const app = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  rooms: roomsRouter,
  agenda: agendaRouter,
  chat: chatRouter,
  user: userRouter,
  group: groupRouter,
  task: tasksRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
