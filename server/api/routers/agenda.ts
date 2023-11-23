import { z } from "zod";
import { Status } from "@prisma/client";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

export const agendaRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        cursor: z.string().nullish(),
        userId: z.string(),
        input: z.string().optional(),
        dep: z.string().optional(),
        role: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const users = await prisma.user.findMany({
        where: {
          id: { not: input.userId || "system" },
          name: { contains: input.input, mode: "insensitive" },
          departmentName: { contains: input.dep },
          role: { contains: input.role },
        },
        orderBy: { name: "asc" },
        include: { groups: false },
        cursor: input.cursor ? { id: input.cursor } : undefined,
        take: input.limit ? input.limit + 1 : undefined,
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (input.limit)
        if (users.length > input.limit) {
          const nextItem = users.pop();
          nextCursor = nextItem!.id;
        }
      return {
        users,
        nextCursor,
      };
    }),
});
