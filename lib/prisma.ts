import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL 環境變數尚未設定，無法連線至資料庫');
    this.name = 'DatabaseNotConfiguredError';
  }
}

const databaseUrl = process.env.DATABASE_URL;

export const isDatabaseConfigured = typeof databaseUrl === 'string' && databaseUrl.trim().length > 0;

let prismaClient: PrismaClient | undefined;

if (isDatabaseConfigured) {
  prismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: ['info', 'warn', 'error']
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaClient;
  }
}

export function getPrismaClient() {
  if (!prismaClient) {
    throw new DatabaseNotConfiguredError();
  }
  return prismaClient;
}

export { DatabaseNotConfiguredError };
