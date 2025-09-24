import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL 環境變數尚未設定，無法連線至資料庫');
    this.name = 'DatabaseNotConfiguredError';
  }
}

function hasDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  return typeof url === 'string' && url.trim().length > 0;
}

let prismaClient: PrismaClient | undefined;

function createPrismaClient() {
  return (
    globalForPrisma.prisma ??
    new PrismaClient({
      log: ['info', 'warn', 'error']
    })
  );
}

export function isDatabaseConfigured() {
  return hasDatabaseUrl();
}

export function getPrismaClient() {
  if (!hasDatabaseUrl()) {
    throw new DatabaseNotConfiguredError();
  }

  if (!prismaClient) {
    prismaClient = createPrismaClient();

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaClient;
    }
  }

  return prismaClient;
}

export { DatabaseNotConfiguredError };
