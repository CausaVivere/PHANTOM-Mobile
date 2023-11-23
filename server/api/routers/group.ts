import { string, z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ee } from "./chat";
import { prisma } from "~/server/db";

export const groupRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        convId: z.string().optional(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.group_member.findMany({
        where: {
          convId: { contains: input.convId },
        },
      });
    }),
  getMember: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        convId: z.string(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.group_member.findFirst({
        where: {
          convId: input.convId,
          userId: input.userId,
        },
        include: { user: true },
      });
    }),
  getIds: publicProcedure
    .input(
      z.object({
        convId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      let members = await prisma.group_member.findMany({
        where: {
          convId: { contains: input.convId },
        },
        select: { userId: true },
      });

      let memberIds: string[] = [];
      for (let i = 0; i < members.length; i++) {
        memberIds.push(members[i]!.userId);
      }

      return memberIds;
    }),
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        creatorId: z.string(),
        image: z.string().optional(),
        users: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let conv = await prisma.conversation.create({
        data: {
          icon: input.image as string,
          name: input.name,
          lastInteracted: new Date(),
          isGroup: true,
        },
        include: { members: true },
      });

      for (let i = 0; i < input.users.length; i++) {
        const user = await prisma.user.findFirst({
          where: { id: input.users[i] },
        });
        await prisma.group_member.create({
          data: {
            convId: conv.id as string,
            userId: input.users[i] as string,
            name: user?.name as string,
            joinDate: new Date(),
            leftDate: new Date(),
            isAdmin: user?.id === input.creatorId ? true : false,
          },
        });
      }

      const newmessage = await prisma.message.create({
        data: {
          from_userId: "system",
          memberId: "system",
          originalSender: "system",
          message: "Grupul a fost creat.",
          date: new Date(),
          convId: conv.id,
          read: [],
          hidden: [],
        },
        include: {
          member: {
            include: { user: true },
          },
          reply: { include: { member: true } },
        },
      });

      await prisma.conversation.update({
        where: {
          id: conv.id,
        },
        data: {
          lastInteracted: new Date(),
        },
      });

      ee.emit("sendMessage", newmessage);

      const newconv = await prisma.conversation.findFirst({
        where: {
          isGroup: true,
          id: conv.id,
        },
        include: {
          members: { include: { user: true } },
        },
      });
      if (newconv) ee.emit("addConv", newconv);
      return newconv;
    }),
  addMembers: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        users: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let members = await prisma.group_member.findMany({
        where: {
          convId: { contains: input.convId },
        },
        select: { userId: true },
      });

      let memberIds: string[] = [];
      for (let i = 0; i < members.length; i++) {
        memberIds.push(members[i]!.userId);
      }

      for (let i = 0; i < input.users.length; i++) {
        const user = await prisma.user.findFirst({
          where: { id: input.users[i] },
        });
        if (user)
          if (!memberIds.includes(user?.id)) {
            const newmember = await prisma.group_member.create({
              data: {
                convId: input.convId as string,
                userId: input.users[i] as string,
                name: user?.name as string,
                joinDate: new Date(),
              },
            });
            const newmessage = await prisma.message.create({
              data: {
                from_userId: "system",
                memberId: "system",
                originalSender: "system",
                message: newmember.name + " s-a alăturat grupului.",
                date: new Date(),
                convId: input.convId!,
                read: [],
                hidden: [],
              },
              include: {
                member: {
                  include: { user: true },
                },
                reply: { include: { member: true } },
              },
            });

            await prisma.conversation.update({
              where: {
                id: input.convId,
              },
              data: {
                lastInteracted: new Date(),
              },
            });

            ee.emit("sendMessage", newmessage);
          }
      }

      const newconv = await prisma.conversation.findFirst({
        where: {
          isGroup: true,
          id: input.convId,
        },
        include: {
          members: { include: { user: true } },
        },
      });
      if (newconv) ee.emit("updateConv", newconv);
      return newconv;
    }),
  removeMember: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deletedMember = await prisma.group_member.delete({
        where: { id: input.memberId },
      });

      const newmessage = await prisma.message.create({
        data: {
          from_userId: "system",
          memberId: "system",
          originalSender: "system",
          message: deletedMember.name + " a fost dat afară din grup.",
          date: new Date(),
          convId: input.convId!,
          read: [],
          hidden: [],
        },
        include: {
          member: {
            include: { user: true },
          },
          reply: { include: { member: true } },
        },
      });

      await prisma.conversation.update({
        where: {
          id: input.convId,
        },
        data: {
          lastInteracted: new Date(),
        },
      });

      ee.emit("sendMessage", newmessage);

      // ee.emit("update", update);
      const newconv = await prisma.conversation.findFirst({
        where: { id: input.convId },
        include: {
          members: { include: { user: true } },
        },
      });
      if (newconv) ee.emit("updateConv", newconv);
      return newconv;
    }),
  leaveGroup: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deletedMember = await prisma.group_member.delete({
        where: { id: input.memberId },
      });

      const newmessage = await prisma.message.create({
        data: {
          from_userId: "system",
          memberId: "system",
          originalSender: "system",
          message: deletedMember.name + " a părăsit grupul.",
          date: new Date(),
          convId: input.convId!,
          read: [],
          hidden: [],
        },
        include: {
          member: {
            include: { user: true },
          },
          reply: { include: { member: true } },
        },
      });

      await prisma.conversation.update({
        where: {
          id: input.convId,
        },
        data: {
          lastInteracted: new Date(),
        },
      });

      ee.emit("sendMessage", newmessage);

      // ee.emit("update", update);
      const newconv = await prisma.conversation.findFirst({
        where: { id: input.convId },
        include: {
          members: { include: { user: true } },
        },
      });
      if (newconv) ee.emit("leaveConv", newconv, deletedMember.userId);
      return newconv;
    }),
  makeAdmin: publicProcedure
    .input(
      z.object({
        memberId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateMember = await prisma.group_member.update({
        where: { id: input.memberId },
        data: {
          isAdmin: true,
        },
      });

      const newmessage = await prisma.message.create({
        data: {
          from_userId: "system",
          memberId: "system",
          originalSender: "system",
          message: updateMember.name + " a devenit admin.",
          date: new Date(),
          convId: updateMember.convId,
          read: [],
          hidden: [],
        },
        include: {
          member: {
            include: { user: true },
          },
          reply: { include: { member: true } },
        },
      });

      await prisma.conversation.update({
        where: {
          id: updateMember.convId,
        },
        data: {
          lastInteracted: new Date(),
        },
      });

      ee.emit("sendMessage", newmessage);

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
  removeAdmin: publicProcedure
    .input(
      z.object({
        memberId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateMember = await prisma.group_member.update({
        where: { id: input.memberId },
        data: {
          isAdmin: false,
        },
      });

      const newmessage = await prisma.message.create({
        data: {
          from_userId: "system",
          memberId: "system",
          originalSender: "system",
          message: updateMember.name + " nu mai este admin.",
          date: new Date(),
          convId: updateMember.convId,
          read: [],
          hidden: [],
        },
        include: {
          member: {
            include: { user: true },
          },
          reply: { include: { member: true } },
        },
      });

      await prisma.conversation.update({
        where: {
          id: updateMember.convId,
        },
        data: {
          lastInteracted: new Date(),
        },
      });

      ee.emit("sendMessage", newmessage);

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
  changeGroupName: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const conv = await prisma.conversation.update({
        where: { id: input.convId },
        data: {
          name: input.name,
          lastInteracted: new Date(),
        },
        include: {
          members: { include: { user: true } },
        },
      });

      const newmessage = await prisma.message.create({
        data: {
          from_userId: "system",
          memberId: "system",
          originalSender: "system",
          message: "Numele grupului a fost schimbat în: " + conv.name,
          date: new Date(),
          convId: input.convId,
          read: [],
          hidden: [],
        },
        include: {
          member: {
            include: { user: true },
          },
          reply: { include: { member: true } },
        },
      });

      ee.emit("sendMessage", newmessage);

      // ee.emit("update", update);

      if (conv) ee.emit("updateConv", conv);
      return conv;
    }),
  changeGroupPhoto: publicProcedure
    .input(
      z.object({
        convId: z.string(),
        image: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const conv = await prisma.conversation.update({
        where: { id: input.convId },
        data: {
          icon: input.image,
          lastInteracted: new Date(),
        },
        include: {
          members: { include: { user: true } },
        },
      });

      const newmessage = await prisma.message.create({
        data: {
          from_userId: "system",
          memberId: "system",
          originalSender: "system",
          message: "Fotografia grupului a fost schimbată",
          date: new Date(),
          convId: input.convId,
          read: [],
          hidden: [],
        },
        include: {
          member: {
            include: { user: true },
          },
          reply: { include: { member: true } },
        },
      });

      ee.emit("sendMessage", newmessage);

      // ee.emit("update", update);

      if (conv) ee.emit("updateConv", conv);
      return conv;
    }),
  changeNickname: publicProcedure
    .input(
      z.object({
        myName: z.string(),
        theirName: z.string(),
        memberId: z.string(),
        nickname: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateMember = await prisma.group_member.update({
        where: { id: input.memberId },
        data: {
          name: input.nickname,
        },
      });

      const newmessage = await prisma.message.create({
        data: {
          from_userId: "system",
          memberId: "system",
          originalSender: "system",
          message:
            input.myName +
            " îi a pus porecla: " +
            updateMember.name +
            " lui " +
            input.theirName,
          date: new Date(),
          convId: updateMember.convId,
          read: [],
          hidden: [],
        },
        include: {
          member: {
            include: { user: true },
          },
          reply: { include: { member: true } },
        },
      });

      await prisma.conversation.update({
        where: {
          id: updateMember.convId,
        },
        data: {
          lastInteracted: new Date(),
        },
      });

      ee.emit("sendMessage", newmessage);

      // ee.emit("update", update);
      const newconv = await prisma.conversation.findFirst({
        where: { id: updateMember.convId },
        include: {
          members: { include: { user: true } },
        },
      });
      if (newconv) ee.emit("nicknameUpdate", newconv);
      return newconv;
    }),
});
