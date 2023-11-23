import { Prisma } from "@prisma/client";
import { observable } from "@trpc/server/observable";
import EventEmitter from "events";
import { z } from "zod";
import admin from "firebase-admin";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { Input } from "postcss";

type Task = Prisma.TaskGetPayload<{
  include: { creator: true; carrier: true };
}>;

interface MyEvents {
  addTask: (data: Task) => void;
  delTask: (data: Task) => void;
  update: (data: Task) => void;
  test: () => void;
}
declare interface MyEventEmitter {
  on<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  off<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  once<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  emit<TEv extends keyof MyEvents>(
    event: TEv,
    ...args: Parameters<MyEvents[TEv]>
  ): boolean;
}

class MyEventEmitter extends EventEmitter {}

// In a real app, you'd probably use Redis or something
const ee = new MyEventEmitter();

export const tasksRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        input: z.string().optional(),
        status: z.string().optional(),
        department: z.string().optional(),
        userDep: z.string(),
        limit: z.number(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tasks =
        input.userDep === "Management"
          ? await prisma.task.findMany({
              where: {
                title: { contains: input.input, mode: "insensitive" },
                status: { contains: input.status },
                departmentName: { contains: input.department },
                // OR: {
                //   // id: { contains: input.id },

                //   // description: { contains: input.input },
                //   // creator: { name: { contains: input.input } },
                // },
              },
              orderBy: { dateAdded: "desc" },
              include: { creator: true, carrier: true },
              cursor: input.cursor ? { id: input.cursor } : undefined,
              take: input.limit + 1,
            })
          : await prisma.task.findMany({
              where: {
                title: { contains: input.input, mode: "insensitive" },
                status: { contains: input.status },
                departmentName: input.userDep,
                // OR: {
                //   // id: { contains: input.id },

                //   // description: { contains: input.input },
                //   // creator: { name: { contains: input.input } },
                // },
              },
              orderBy: { dateAdded: "desc" },
              include: { creator: true, carrier: true },
              cursor: input.cursor ? { id: input.cursor } : undefined,
              take: input.limit + 1,
            });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (tasks.length > input.limit) {
        const nextItem = tasks.pop();
        nextCursor = nextItem!.id;
      }

      return {
        tasks,
        nextCursor,
      };
    }),
  getModalTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      return prisma.task.findFirst({
        where: { id: input.id },
        include: { creator: true, carrier: true },
      });
    }),
  getSomeTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.task.findFirst({
        where: { id: input.id },
        include: { creator: true, carrier: true },
      });
    }),
  getTaskStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      return prisma.task.findFirst({
        where: { id: input.id },
        select: { status: true, carrier: true },
      });
    }),
  getDepsWithTasks: publicProcedure
    .input(
      z.object({
        dep: z.string().optional(),
        status: z.string().optional(),
        limit: z.number(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ input, ctx }) => {
      const deps = await prisma.department.findMany({
        where: {
          name: { contains: input.dep },
          tasks: { some: { status: { contains: input.status } } },
        },
        orderBy: { name: "asc" },
        include: { tasks: { include: { creator: true, carrier: true } } },
        cursor: input.cursor ? { id: input.cursor } : undefined,
        take: input.limit + 1,
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (deps.length > input.limit) {
        const nextItem = deps.pop();
        nextCursor = nextItem!.id;
      }

      return {
        deps,
        nextCursor,
      };
    }),

  getDepartments: publicProcedure
    .input(
      z.object({
        userDep: z.string(),
      })
    )
    .query(({ input }) => {
      return input.userDep === "Management"
        ? prisma.department.findMany({
            select: { name: true },
            orderBy: { name: "asc" },
          })
        : null;
    }),
  addTask: publicProcedure
    .input(
      z.object({
        department: z.string(),
        userId: z.string(),
        title: z.string(),
        desc: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const task = await prisma.task.create({
        data: {
          departmentName: input.department,
          creatorId: input.userId,
          title: input.title,
          description: input.desc,
          dateAdded: new Date(),
          status: "awaiting",
        },
        include: { creator: true, carrier: true },
      });

      ee.emit("addTask", task);

      const department = await prisma.department.findFirst({
        where: { name: task.departmentName },
        include: { members: true },
      });

      let tokens: Array<string> = [];
      if (department)
        for (let i = 0; i < department.members.length; i++) {
          if (
            department.members[i]!.notificationToken !== "" &&
            !tokens.includes(department.members[i]!.notificationToken) &&
            department.members[i]?.id !== input.userId
          )
            tokens.push(department.members[i]!.notificationToken);
        }

      const message = {
        notification: {
          title: "Sarcină nouă: " + task.title,
          body: task.description,
        },
        group: "tasks",
        data: { type: "task", taskId: task.id },
        android: {
          notification: {
            tag: task.id,
            priority: "high",
            color: "#ed113d",
            channel_id: "phantom-mobile-tasks",
          },
        },
        tokens: tokens,
      };
      if (tokens[0]) {
        admin
          .messaging()
          //@ts-ignore
          .sendMulticast(message)
          .then((response) => {
            console.log(tokens);
            console.log(
              response.successCount + " messages were sent successfully"
            );
            console.log(response.responses);
          });
      }

      return task;
    }),
  updateTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
        status: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const task = await prisma.task.update({
        where: {
          id: input.id,
        },
        data: {
          carrierId: input.userId,
          status: input.status,
        },
        include: { creator: true, carrier: true },
      });

      ee.emit("update", task);
      return task;
    }),
  deleteTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const task = await prisma.task.findFirst({
        where: { id: { contains: input.id } },
        include: { creator: true, carrier: true },
      });
      let tasklog;
      if (task) {
        tasklog = await prisma.taskHistory.create({
          data: {
            departmentName: task.departmentName,
            creatorId: task.creatorId,
            creatorName: task.creator.name,
            carrierId: task.carrierId,
            carrierName: task.carrier?.name,
            title: task.title,
            description: task.description,
            dateAdded: task.dateAdded!,
            dateCompleted: task.dateCompleted,
            bookmarked: task.bookmarked,
            status: task.status,
          },
        });
      }
      const deltask = await prisma.task.delete({
        where: { id: input.id },
        include: { creator: true, carrier: true },
      });

      ee.emit("delTask", deltask);

      return deltask;
    }),
  bookmark: publicProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const task = await prisma.task.update({
        where: {
          id: input.id,
        },
        data: {
          bookmarked: {
            push: input.userId,
          },
        },
        include: { creator: true, carrier: true },
      });
      ee.emit("update", task);
      return task;
    }),
  unBookmark: publicProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const task = await prisma.task.findFirst({
        where: { id: { contains: input.id } },
        select: {
          bookmarked: true,
        },
      });

      const update = await prisma.task.update({
        where: {
          id: input.id,
        },
        data: {
          bookmarked: {
            set: task?.bookmarked.filter((id: any) => id !== input.userId),
          },
        },
        include: { creator: true, carrier: true },
      });

      ee.emit("update", update);
      return update;
    }),
  getBookmarked: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.task.findMany({
        where: {
          bookmarked: {
            has: input.userId,
          },
        },
        orderBy: { dateAdded: "desc" },
        include: { creator: true, carrier: true },
      });
    }),
  onAddTask: publicProcedure
    .input(
      z.object({
        department: z.string(),
      })
    )
    .subscription(({ input }) => {
      // return an `observable` with a callback which is triggered immediately
      return observable<Task>((emit) => {
        const onAdd = (data: Task) => {
          if (
            data.departmentName === input.department ||
            input.department === "Management"
          )
            emit.next(data);
        };

        ee.on("addTask", onAdd);

        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("addTask", onAdd);
        };
      });
    }),
  onDeleteTask: publicProcedure
    .input(
      z.object({
        department: z.string(),
      })
    )
    .subscription(({ input }) => {
      // return an `observable` with a callback which is triggered immediately
      return observable<Task>((emit) => {
        const delTask = (data: Task) => {
          if (
            data.departmentName === input.department ||
            input.department === "Management"
          )
            emit.next(data);
        };

        ee.on("delTask", delTask);

        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("delTask", delTask);
        };
      });
    }),
  taskUpdates: publicProcedure
    .input(
      z.object({
        department: z.string(),
      })
    )
    .subscription(({ input }) => {
      // return an `observable` with a callback which is triggered immediately
      return observable<Task>((emit) => {
        const update = (data: Task) => {
          if (
            data.departmentName === input.department ||
            input.department === "Management"
          )
            emit.next(data);
        };

        ee.on("update", update);

        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("update", update);
        };
      });
    }),
});
