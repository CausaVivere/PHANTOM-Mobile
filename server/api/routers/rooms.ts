import { Status } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

export const roomsRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        number: z.string().optional(),
        status: z.string().optional(),
        typeId: z.string().optional(),
      })
    )
    .query(({ input, ctx }) => {
      return prisma.room.findMany({
        orderBy: { floor: "asc" },
        include: { type: true },
        where: {
          number: { contains: input.number },
          status: input.status as Status,
          typeId: input.typeId,
        },
      });
    }),
  getTypes: publicProcedure.query(({ ctx }) => prisma.roomType.findMany()),
  count: publicProcedure.query(async ({ ctx }) => {
    const rooms = await prisma.room.findMany({
      where: { status: "FREE" },
    });
    return rooms.length;
  }),
});
