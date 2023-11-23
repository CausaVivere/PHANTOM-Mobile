import { User } from "@prisma/client";
import { observable } from "@trpc/server/observable";
import EventEmitter from "eventemitter3";
import { string, z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

// interface MyEvents {
//   statusUpdate: () => void;
//   userUpdate: (data: User) => void;
//   test: () => void;
// }
// declare interface MyEventEmitter {
//   on<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
//   off<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
//   once<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
//   emit<TEv extends keyof MyEvents>(
//     event: TEv,
//     ...args: Parameters<MyEvents[TEv]>
//   ): boolean;
// }

// class MyEventEmitter extends EventEmitter {}

// In a real app, you'd probably use Redis or something
export const ee = new EventEmitter();

interface statuses {
  onlineUsers: string[];
  awayUsers: string[];
}

const statuses: statuses = {
  onlineUsers: [],
  awayUsers: [],
};

ee.on("disconnect", (userId: string) => {
  for (let i = 0; i < statuses.onlineUsers.length; i++) {
    if (statuses.onlineUsers[i] === userId) {
      statuses.onlineUsers.splice(i, 1);
    }
  }
  for (let i = 0; i < statuses.awayUsers.length; i++) {
    if (statuses.awayUsers[i] === userId) {
      statuses.awayUsers.splice(i, 1);
    }
  }

  ee.emit("statusUpdate");
});

export const userRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.user.findFirst({
        where: {
          id: input.userId,
        },
      });
    }),
  getMutation: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(({ input, ctx }) => {
      return prisma.user.findFirst({
        where: {
          id: input.userId,
        },
      });
    }),
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        tag: z.string(),
        email: z.string(),
        password: z.string(),
        icon: z.string().optional(),
        phone: z.string(),
      })
    )
    .mutation(({ input, ctx }) => {
      return prisma.user.create({
        data: {
          name: input.name,
          tag: input.tag,
          email: input.email,
          password: input.password,
          icon: input.icon,
          phone_number: input.phone,
        },
      });
    }),
  getOtherUser: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        userId: z.string(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.group_member.findFirst({
        where: {
          convId: input.convId,
          userId: { not: input.userId },
        },
        include: {
          user: true,
        },
      });
    }),
  updateStatus: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        status: z.string(),
      })
    )
    .mutation(({ input }) => {
      if (
        input.status === "online" &&
        !statuses.onlineUsers.includes(input.userId)
      ) {
        statuses.onlineUsers.push(input.userId);
      } else if (
        input.status === "away" &&
        !statuses.awayUsers.includes(input.userId)
      ) {
        statuses.awayUsers.push(input.userId);
      } else if (input.status === "offline") {
        ee.emit("disconnect", input.userId);
      }
      // onlineUsers.push(input.userId);
      ee.emit("statusUpdate");
    }),
  statuses: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .subscription(({ input }) => {
      return observable<statuses>((emit) => {
        const statusUpdate = () => {
          emit.next(statuses);
        };

        emit.next(statuses);

        ee.on("statusUpdate", statusUpdate);
        return () => {
          ee.off("statusUpdate", statusUpdate);
        };
      });
    }),
  completeProfile: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        tag: z.string(),
        phone: z.string(),
      })
    )
    .mutation(({ input }) => {
      return prisma.user.update({
        where: { id: input.userId },
        data: {
          tag: input.tag,
          phone_number: input.phone,
        },
      });
    }),
  updateProfile: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        colors: z.array(z.string()).optional(),
        image: z.string().optional(),
        bgimage: z.string().optional(),
        opacity: z.number().optional(),
      })
    )
    .mutation(({ input }) => {
      return prisma.user.update({
        where: { id: input.userId },
        data: {
          colors: input.colors,
          icon: input.image,
          bgImage: input.bgimage,
          bgOpacity: input.opacity,
        },
      });
    }),
  setToken: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        token: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findFirst({
        where: { id: input.userId },
      });
      if (user?.notificationToken !== input.token)
        return prisma.user.update({
          where: {
            id: input.userId,
          },
          data: { notificationToken: input.token },
        });
      else return;
    }),
  // userUpdates: publicProcedure
  //   .input(
  //     z.object({
  //       userId: z.string(),
  //     })
  //   )
  //   .subscription(({ input }) => {
  //     // return an `observable` with a callback which is triggered immediately
  //     return observable<User>((emit) => {
  //       const updateUser = (user: User) => {
  //         if (input.userId === user.userId) emit.next(user);
  //       };

  //       ee.on("userUpdate", updateUser);
  //       // unsubscribe function when client disconnects or stops subscribing
  //       return () => {
  //         ee.off("userUpdate", updateUser);
  //       };
  //     });
  //   }),
});
