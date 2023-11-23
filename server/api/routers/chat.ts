import { Prisma, Status, User } from "@prisma/client";
import { observable } from "@trpc/server/observable";
import { createNanoEvents } from "nanoevents";
import { z } from "zod";
import EventEmitter from "eventemitter3";
import { prisma } from "~/server/db";
import admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

type Message = Prisma.MessageGetPayload<{
  include: {
    member: {
      include: { user: true };
    };
    reply: {
      include: { member: { include: { user: { select: { colors: true } } } } };
    };
  };
}>;

type Conversation = Prisma.ConversationGetPayload<{
  include: {
    members: { include: { user: true } };
  };
}>;

const imgformats = [".gif", ".jpg", ".png", "jpeg"];
const videoformats = [".mp4", "webm"];
const audioformats = [".mp3", ".aac", ".ogg"];

interface MyEvents {
  sendMessage: (data: Message) => void;
  isTypingUpdate: (convId: string) => void;
  test: () => void;
  update: (data: Message) => void;

  addConv: (data: Conversation) => void;
  updateConv: (data: Conversation) => void;
  nicknameUpdate: (data: Conversation) => void;
  leaveConv: (data: Conversation, userId: string) => void;
}
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

// who is currently typing, key is `name`
const currentlyTyping: Record<string, { lastTyped: Date }> =
  Object.create(null);

// every 1s, clear old "isTyping"
const interval = setInterval(() => {
  let updated = false;
  const now = Date.now();
  for (const [key, value] of Object.entries(currentlyTyping)) {
    if (now - value.lastTyped.getTime() > 3e3) {
      delete currentlyTyping[key];
      updated = true;
    }
  }
  if (updated) {
    ee.emit("isTypingUpdate", "update");
  }
}, 3e3);
process.on("SIGTERM", () => {
  clearInterval(interval);
});

export const chatRouter = createTRPCRouter({
  // getConvs without empty conversations (with no messsages) , unoptimized and ignores groups
  // getConvs: publicProcedure
  //   .input(
  //     z.object({
  //       userId: z.string().optional(),
  //     })
  //   )
  //   .query(async ({ input, ctx }) => {
  //     const convs = await prisma.conversation.findMany({
  //       orderBy: { lastInteracted: "desc" },
  //       include: { members: true, messages: true },
  //       where: {
  //         members: {
  //           some: {
  //             userId: input.userId,
  //           },
  //         },
  //       },
  //     });
  //     return convs.filter((conv) => conv.messages.length > 0);
  //   }),

  getConvs: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        limit: z.number(),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ input, ctx }) => {
      const convs = await prisma.conversation.findMany({
        orderBy: { lastInteracted: "desc" },
        include: {
          members: { include: { user: true } },
        },
        where: {
          members: {
            some: {
              userId: input.userId,
            },
          },
        },
        cursor: input.cursor ? { id: input.cursor } : undefined,
        take: input.limit + 1,
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (convs.length > input.limit) {
        const nextItem = convs.pop();
        nextCursor = nextItem!.id;
      }

      return {
        convs,
        nextCursor,
      };
    }),
  getGroups: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        input: z.string().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return prisma.conversation.findMany({
        orderBy: { lastInteracted: "desc" },
        include: {
          members: { include: { user: true } },
        },
        where: {
          isGroup: true,
          name: { contains: input.input, mode: "insensitive" },
          members: {
            some: {
              userId: input.userId,
            },
          },
        },
        take: input.take,
      });
    }),
  getGroupsWithUser: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        input: z.string().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return prisma.conversation.findMany({
        orderBy: { lastInteracted: "desc" },
        include: { members: { select: { user: true } } },
        where: {
          isGroup: true,
          name: { contains: input.input, mode: "insensitive" },
          members: {
            some: {
              userId: input.userId,
            },
          },
        },
        take: input.take,
      });
    }),
  getConvsForwards: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return prisma.conversation.findMany({
        orderBy: { lastInteracted: "desc" },
        include: { members: { select: { user: true } } },
        where: {
          members: {
            some: {
              userId: input.userId,
            },
          },
        },
        take: input.take,
      });
    }),
  getConv: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        contactId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let conv = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          members: {
            every: {
              userId: { in: [input.userId, input.contactId] },
            },
          },
        },
        include: {
          members: { include: { user: true } },
        },
      });
      if (conv === null) {
        const user = await prisma.user.findFirst({
          where: { id: input.userId },
        });

        const contact = await prisma.user.findFirst({
          where: { id: input.contactId },
        });

        let conv = await prisma.conversation.create({
          data: {
            icon: "",
            name: "",
            lastInteracted: new Date(),
            isGroup: false,
          },
          include: { members: true },
        });

        await prisma.group_member.create({
          data: {
            convId: conv.id as string,
            userId: input.userId as string | "",
            name: user?.name as string,
            joinDate: new Date(),
          },
        });

        await prisma.group_member.create({
          data: {
            convId: conv.id as string,
            userId: input.contactId as string | "",
            name: contact?.name as string,
            joinDate: new Date(),
            leftDate: new Date(),
          },
        });

        const newconv = await prisma.conversation.findFirst({
          where: {
            isGroup: false,
            members: {
              every: {
                userId: {
                  in: [input.userId as string, input.contactId],
                },
              },
            },
          },
          include: {
            members: {
              include: { user: true },
            },
          },
        });

        if (newconv) ee.emit("addConv", newconv);

        return newconv;
      } else {
        return conv;
      }
    }),
  getConvForwards: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        contactId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let conv = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          members: {
            some: {
              userId: { contains: input.userId && input.contactId },
            },
          },
        },
      });
      if (conv === null) {
        const user = await prisma.user.findFirst({
          where: { id: input.userId },
        });

        const contact = await prisma.user.findFirst({
          where: { id: input.contactId },
        });

        let conv = await prisma.conversation.create({
          data: {
            icon: "",
            name: "",
            lastInteracted: new Date(),
            isGroup: false,
          },
        });

        await prisma.group_member.create({
          data: {
            convId: conv.id as string,
            userId: input.userId as string | "",
            name: user?.name as string,
            joinDate: new Date(),
          },
        });

        await prisma.group_member.create({
          data: {
            convId: conv.id as string,
            userId: input.contactId as string | "",
            name: contact?.name as string,
            joinDate: new Date(),
            leftDate: new Date(),
          },
        });

        return prisma.conversation.findFirst({
          orderBy: { lastInteracted: "desc" },
          include: { members: { select: { user: true } } },
          where: { id: { contains: conv.id } },
        });
      } else {
        return prisma.conversation.findFirst({
          orderBy: { lastInteracted: "desc" },
          include: { members: { select: { user: true } } },
          where: { id: { contains: conv.id } },
        });
      }
    }),
  getSomeConv: publicProcedure
    .input(
      z.object({
        convId: z.string(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.conversation.findFirst({
        where: { id: input.convId },
        include: { members: { include: { user: true } } },
      });
    }),
  getSomeConvMutation: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        convId: z.string(),
      })
    )
    .mutation(({ input, ctx }) => {
      return prisma.conversation.findFirst({
        where: { id: input.convId },
        include: { members: { include: { user: true } } },
      });
    }),
  setConv: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        contactId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = await prisma.user.findFirst({
        where: { id: input.userId },
      });

      const contact = await prisma.user.findFirst({
        where: { id: input.userId },
      });

      let conv = await prisma.conversation.create({
        data: {
          icon: "",
          name: "",
          lastInteracted: new Date(),
          isGroup: false,
        },
        include: { members: true },
      });

      await prisma.group_member.create({
        data: {
          convId: conv.id as string,
          userId: input.userId as string | "",
          name: user?.name as string,
          joinDate: new Date(),
          leftDate: new Date(),
        },
      });

      await prisma.group_member.create({
        data: {
          convId: conv.id as string,
          userId: input.contactId as string | "",
          name: contact?.name as string,
          joinDate: new Date(),
          leftDate: new Date(),
        },
      });

      const newconv = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          members: {
            some: {
              userId: { contains: input.userId && input.contactId },
            },
          },
        },
        include: {
          members: { include: { user: true } },
        },
      });

      if (newconv) ee.emit("addConv", newconv);

      return newconv;
    }),
  getMessages: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        limit: z.number(),
        cursor: z.string().nullish().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const msgs = await prisma.message.findMany({
        where: {
          convId: input.convId,
          message: { contains: input.search, mode: "insensitive" },
        },
        orderBy: {
          date: "desc",
        },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          reply: {
            include: {
              member: { include: { user: { select: { colors: true } } } },
            },
          },
        },
        cursor: input.cursor ? { messageId: input.cursor } : undefined,
        take: input.limit + 1,
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (msgs.length > input.limit) {
        const nextItem = msgs.pop();
        nextCursor = nextItem!.messageId;
      }
      msgs.reverse();

      return {
        msgs,
        nextCursor,
      };
    }),
  getFirstMessages: publicProcedure
    .input(
      z.object({
        convId: z.string().optional(),
        limit: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const msgs = await prisma.message.findMany({
        where: {
          convId: { contains: input.convId },
        },
        orderBy: {
          date: "desc",
        },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          reply: {
            include: {
              member: { include: { user: { select: { colors: true } } } },
            },
          },
        },
        take: input.limit,
      });

      msgs.reverse();

      return msgs;
    }),
  // getMessagesGrouped: publicProcedure
  //   .input(
  //     z.object({
  //       convId: z.string(),
  //       memberId: z.string(),
  //       take: z.number(),
  //     })
  //   )
  //   .query(async ({ input, ctx }) => {
  //     const daysRaw = (await prisma.$queryRaw`
  //     SELECT DATE("date") AS day, COUNT(*) AS count
  //     FROM "messages"
  //     WHERE "convId" = ${input.convId}
  //     GROUP BY day
  //     ORDER BY day DESC
  //     ;
  //   `) as any;

  //     const days = await daysRaw.map((day: { day: any }) => ({
  //       day: day.day,
  //     }));

  //     let take = input.take;

  //     for (let i = 0; i < days.length; i++) {
  //       let nextday: Date;
  //       days[i - 1]
  //         ? (nextday = days[i - 1].day)
  //         : (nextday = addDays(days[i].day, 1));
  //       // console.log(days[i].day >= nextday);
  //       const somemsgs: Array<object> = await prisma.message.findMany({
  //         where: {
  //           convId: { contains: input.convId },
  //           date: { gte: days[i].day, lte: nextday },
  //         },
  //         orderBy: {
  //           date: "desc",
  //         },
  //         include: { member: true, reply: { include: { member: true } } },
  //         take: take,
  //       });
  //       somemsgs.reverse();
  //       days[i].messages = somemsgs;
  //       take -= somemsgs.length;
  //     }
  //     days.reverse();
  //     return days as Array<day>;
  //   }),
  getMessage: publicProcedure
    .input(
      z.object({
        msgId: z.string(),
      })
    )
    .mutation(({ input, ctx }) => {
      return prisma.message.findFirst({
        where: {
          messageId: { contains: input.msgId },
        },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          reply: {
            include: {
              member: { include: { user: { select: { colors: true } } } },
            },
          },
        },
      });
    }),
  getLastMessage: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        userId: z.string(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.message.findFirst({
        where: {
          convId: { contains: input.convId },
          NOT: { hidden: { has: input.userId } },
        },
        orderBy: {
          date: "desc",
        },
        take: 1,
      });
    }),
  sendMessage: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        userId: z.string(),
        replyId: z.string().optional(),
        memberId: z.string(),
        msg: z.string(),
        media: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const newmessage = await prisma.message.create({
        data: {
          from_userId: input.userId,
          memberId: input.memberId,
          replyId: input.replyId,
          originalSender: input.userId,
          message: input.msg!,
          media: input.media,
          date: new Date(),
          convId: input.convId!,
          read: [input.userId!],
          hidden: [],
        },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          reply: {
            include: {
              member: { include: { user: { select: { colors: true } } } },
            },
          },
        },
      });

      ee.emit("sendMessage", newmessage);

      const conv = await prisma.conversation.update({
        where: {
          id: input.convId,
        },
        data: {
          lastInteracted: new Date(),
          media: { push: input.media },
        },
        include: {
          members: { include: { user: true } },
        },
      });

      let tokens: Array<string> = [];
      for (let i = 0; i < conv.members.length; i++) {
        if (
          conv.members[i]!.user.notificationToken !== "" &&
          !tokens.includes(conv.members[i]!.user.notificationToken) &&
          !conv.members[i]?.muted &&
          conv.members[i]?.userId !== input.userId
        )
          tokens.push(conv.members[i]!.user.notificationToken);
      }

      const message =
        newmessage.media[0] === undefined
          ? {
              notification: {
                title: conv.isGroup ? conv.name : newmessage.member.name,
                body: conv.isGroup
                  ? newmessage.member.name + ": " + newmessage.message
                  : newmessage.message,
                // imageUrl: conv.icon,
              },
              group: conv.name,
              data: { type: "dm", convId: newmessage.convId },
              android: {
                notification: {
                  // tag: conv.id,
                  priority: "high",
                  color: newmessage.member.user.colors[2],
                  channel_id: "phantom-mobile-dm",
                },
              },
              tokens: tokens,
            }
          : newmessage.media[0] &&
            imgformats.includes(
              newmessage.media[0].slice(
                newmessage.media[0].length - 4,
                newmessage.media[0].length
              )
            )
          ? {
              notification: {
                title: conv.isGroup ? conv.name : newmessage.member.name,
                body:
                  newmessage.message === ""
                    ? conv.isGroup
                      ? newmessage.member.name + ": " + "A trimis o imagine."
                      : "A trimis o imagine."
                    : conv.isGroup
                    ? newmessage.member.name + ": " + newmessage.message
                    : newmessage.message,
                imageUrl: newmessage.media[0],
              },
              data: { type: "dm", convId: newmessage.convId },
              android: {
                notification: {
                  tag: conv.id,
                  priority: "high",
                  color: newmessage.member.user.colors[2],
                  channel_id: "phantom-mobile-dm",
                },
              },
              tokens: tokens,
            }
          : newmessage.media[0] &&
            videoformats.includes(
              newmessage.media[0].slice(
                newmessage.media[0].length - 4,
                newmessage.media[0].length
              )
            )
          ? {
              notification: {
                title: conv.isGroup ? conv.name : newmessage.member.name,
                body:
                  newmessage.message === ""
                    ? conv.isGroup
                      ? newmessage.member.name + ": " + "A trimis un videoclip."
                      : "A trimis o imagine."
                    : conv.isGroup
                    ? newmessage.member.name + ": " + newmessage.message
                    : newmessage.message,
                imageUrl: newmessage.media[0],
              },
              data: { type: "dm", convId: newmessage.convId },
              android: {
                notification: {
                  tag: conv.id,
                  priority: "high",
                  color: newmessage.member.user.colors[2],
                  channel_id: "phantom-mobile-dm",
                },
              },
              tokens: tokens,
            }
          : {
              notification: {
                title: conv.isGroup ? conv.name : newmessage.member.name,
                body:
                  newmessage.message === ""
                    ? conv.isGroup
                      ? newmessage.member.name + ": " + "A trimis un videoclip."
                      : "A trimis un fișier."
                    : conv.isGroup
                    ? newmessage.member.name + ": " + newmessage.message
                    : newmessage.message,
                imageUrl: newmessage.media[0],
              },
              data: { type: "dm", convId: newmessage.convId },
              android: {
                notification: {
                  tag: conv.id,
                  priority: "high",
                  color: newmessage.member.user.colors[2],
                  channel_id: "phantom-mobile-dm",
                },
              },
              tokens: tokens,
            };
      if (tokens[0])
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

      return newmessage;
    }),
  deleteMessage: publicProcedure
    .input(
      z.object({
        msgId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let todelete = await prisma.message.findFirst({
        where: { messageId: input.msgId },
      });

      const conv = await prisma.conversation.findFirst({
        where: { id: todelete!.convId },
      });

      await prisma.conversation.update({
        where: { id: todelete!.convId },
        data: {
          media: conv?.media.filter((item) => !todelete!.media.includes(item)),
        },
      });

      const deleted = await prisma.message.update({
        where: { messageId: input.msgId },
        data: {
          message: "deleted.",
          deleted: true,
          media: [],
        },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          reply: {
            include: {
              member: { include: { user: { select: { colors: true } } } },
            },
          },
        },
      });

      ee.emit("update", deleted!);
    }),
  editMessage: publicProcedure
    .input(
      z.object({
        msgId: z.string(),
        input: z.string(),
        convId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.conversation.update({
        where: {
          id: input.convId,
        },
        data: {
          lastInteracted: new Date(),
        },
      });

      const update = await prisma.message.update({
        where: { messageId: input.msgId },
        data: {
          message: input.input,
          edited: true,
          editedDate: new Date(),
        },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          reply: {
            include: {
              member: { include: { user: { select: { colors: true } } } },
            },
          },
        },
      });

      ee.emit("update", update);
      return update;
    }),
  hideMessage: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        msgId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const update = await prisma.message.update({
        where: { messageId: input.msgId },
        data: {
          hidden: {
            push: input.userId,
          },
        },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          reply: {
            include: {
              member: { include: { user: { select: { colors: true } } } },
            },
          },
        },
      });
      ee.emit("update", update);
    }),
  seenMessage: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        msgId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const update = await prisma.message.update({
        where: { messageId: input.msgId },
        data: {
          read: {
            push: input.userId,
          },
        },
        include: {
          member: {
            include: {
              user: true,
            },
          },
          reply: {
            include: {
              member: { include: { user: { select: { colors: true } } } },
            },
          },
        },
      });

      ee.emit("update", update);

      return update;
    }),
  getLastInteracted: publicProcedure
    .input(
      z.object({
        convId: z.string().optional(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.conversation.findFirst({
        where: { id: input.convId },
        select: { lastInteracted: true },
      });
    }),
  sendForwards: publicProcedure
    .input(
      z.object({
        people: z.array(
          z.object({
            icon: z.string(),
            id: z.string(),
            isGroup: z.boolean(),
            lastInteracted: z.date(),
            members: z.array(z.object({})),
            name: z.string(),
          })
        ),
        originalUserId: z.string(),
        userId: z.string(),
        memberId: z.string(),
        msg: z.string(),
        media: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      for (let i = 0; i < input.people.length; i++) {
        const newmessage = await prisma.message.create({
          data: {
            from_userId: input.userId!,
            memberId: input.memberId,
            message: input.msg!,
            media: input.media,
            date: new Date(),
            convId: input.people[i]?.id!,
            originalSender: input.originalUserId,
            forwarded: true,
            read: [input.userId!],
            hidden: [],
          },
          include: {
            member: {
              include: {
                user: true,
              },
            },
            reply: {
              include: {
                member: { include: { user: { select: { colors: true } } } },
              },
            },
          },
        });

        await prisma.conversation.update({
          where: {
            id: input.people[i]?.id!,
          },
          data: {
            lastInteracted: new Date(),
          },
        });

        ee.emit("sendMessage", newmessage);
      }
    }),
  getMedia: publicProcedure
    .input(
      z.object({
        convId: z.string(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.conversation.findFirst({
        where: { id: input.convId },
        select: { media: true },
      });
    }),
  block: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        memberId: z.string(),
        userId: z.string(),
        contactId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const conv = await prisma.conversation.update({
        where: {
          id: input.convId,
        },
        data: {
          blocked: {
            push: input.memberId,
          },
        },
        include: { members: { include: { user: true } } },
      });
      await prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          blocked: {
            push: input.contactId,
          },
        },
      });
      if (conv) ee.emit("updateConv", conv);
      return conv;
    }),
  unblock: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        memberId: z.string(),
        userId: z.string(),
        contactId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let conv = await prisma.conversation.findFirst({
        where: {
          id: input.convId,
        },

        include: { members: { include: { user: true } } },
      });
      const user = await prisma.user.findFirst({
        where: {
          id: input.userId,
        },
      });
      conv = await prisma.conversation.update({
        where: {
          id: input.convId,
        },
        data: {
          blocked: {
            set: conv?.blocked.filter(
              (memberId) => memberId !== input.memberId
            ),
          },
        },
        include: { members: { include: { user: true } } },
      });
      await prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          blocked: {
            set: user?.blocked.filter((userId) => userId !== input.contactId),
          },
        },
      });
      if (conv) ee.emit("updateConv", conv);
      return conv;
    }),
  getBlocked: publicProcedure
    .input(
      z.object({
        convId: z.string(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.conversation.findFirst({
        where: {
          id: input.convId,
        },
        select: { blocked: true },
      });
    }),
  isTyping: publicProcedure
    .input(
      z.object({
        typing: z.boolean(),
        userName: z.string(),
        convId: z.string(),
      })
    )
    .mutation(({ input }) => {
      if (!input.typing) {
        delete currentlyTyping[input.userName];
      } else {
        currentlyTyping[input.userName] = {
          lastTyped: new Date(),
        };
      }
      ee.emit("isTypingUpdate", input.convId);
    }),

  muteConv: publicProcedure
    .input(
      z.object({
        memberId: z.string(),
        toggle: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateMember = await prisma.group_member.update({
        where: { id: input.memberId },
        data: {
          muted: input.toggle,
        },
      });

      // ee.emit("update", update);
      const newconv = await prisma.conversation.findFirst({
        where: { id: updateMember.convId },
        include: {
          members: { include: { user: true } },
        },
      });
      if (newconv) ee.emit("updateConv", newconv);
      return newconv;
    }),
  onSendMessage: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .subscription(({ input }) => {
      // return an `observable` with a callback which is triggered immediately

      return observable<Message>((emit) => {
        const onAdd = async (data: Message) => {
          const theconv = await prisma.conversation.findFirst({
            where: {
              id: data.convId,
              members: { some: { user: { id: input.userId } } },
            },
          });
          if (theconv?.id) emit.next(data);
        };

        ee.on("sendMessage", onAdd);

        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("sendMessage", onAdd);
        };
      });
    }),
  msgUpdates: publicProcedure
    .input(
      z.object({
        convId: z.string(),
      })
    )
    .subscription(({ input }) => {
      // return an `observable` with a callback which is triggered immediately
      return observable<Message>((emit) => {
        const update = (msg: Message) => {
          if (msg.convId === input.convId) emit.next(msg);
        };

        ee.on("update", update);
        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("update", update);
        };
      });
    }),
  onAddConv: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .subscription(({ input }) => {
      // return an `observable` with a callback which is triggered immediately
      return observable<Conversation>((emit) => {
        const addConv = (conv: Conversation) => {
          for (let i = 0; i < conv.members.length; i++) {
            if (conv.members[i]?.userId === input.userId) emit.next(conv);
          }
        };

        ee.on("addConv", addConv);
        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("addConv", addConv);
        };
      });
    }),
  convUpdates: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .subscription(({ input }) => {
      // return an `observable` with a callback which is triggered immediately
      return observable<Conversation>((emit) => {
        const updateConv = (conv: Conversation) => {
          for (let i = 0; i < conv.members.length; i++) {
            if (conv.members[i]?.userId === input.userId) emit.next(conv);
          }
        };

        const leaveConv = (conv: Conversation, userId: string) => {
          if (userId === input.userId) emit.next(conv);
        };

        ee.on("leaveConv", leaveConv);
        ee.on("updateConv", updateConv);
        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("updateConv", updateConv);
          ee.off("leaveConv", leaveConv);
        };
      });
    }),
  nicknameUpdates: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .subscription(({ input }) => {
      // return an `observable` with a callback which is triggered immediately
      return observable<Conversation>((emit) => {
        const updateConv = (conv: Conversation) => {
          for (let i = 0; i < conv.members.length; i++) {
            if (conv.members[i]?.userId === input.userId) emit.next(conv);
          }
        };

        ee.on("nicknameUpdate", updateConv);
        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("nicknameUpdate", updateConv);
        };
      });
    }),
  whoIsTyping: publicProcedure
    .input(
      z.object({
        convId: z.string(),
      })
    )
    .subscription(({ input }) => {
      let prev: string[] | null = null;
      return observable<string[]>((emit) => {
        const onIsTypingUpdate = (convId: string) => {
          if (convId === input.convId || convId == "update") {
            const newData = Object.keys(currentlyTyping);

            if (!prev || prev.toString() !== newData.toString()) {
              emit.next(newData);
            }
            prev = newData;
          }
        };

        ee.on("isTypingUpdate", onIsTypingUpdate);

        return () => {
          ee.off("isTypingUpdate", onIsTypingUpdate);
        };
      });
    }),
});

// function addDays(date: Date, days: number) {
//   const dateCopy = new Date(date);
//   dateCopy.setDate(date.getDate() + days);
//   return dateCopy;
// }

// type day = {
//   day: Date;
//   messages: Array<Message>;
// };
