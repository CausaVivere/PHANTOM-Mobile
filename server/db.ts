import { PrismaClient } from "@prisma/client";

import { env } from "env.mjs";
import { fieldEncryptionExtension } from "prisma-field-encryption";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

export const prisma = client.$extends(
  // This is a function, don't forget to call it:
  fieldEncryptionExtension()
);
//@ts-ignore
if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
