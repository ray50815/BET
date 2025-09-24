import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaCtor = vi.fn(() => ({
  $disconnect: vi.fn()
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: prismaCtor
}));

describe('lib/prisma', () => {
  beforeEach(() => {
    vi.resetModules();
    prismaCtor.mockClear();
    delete (globalThis as { prisma?: unknown }).prisma;
    delete process.env.DATABASE_URL;
  });

  it('throws when DATABASE_URL is missing', async () => {
    const { getPrismaClient, DatabaseNotConfiguredError, isDatabaseConfigured } = await import('../lib/prisma');
    expect(isDatabaseConfigured()).toBe(false);
    expect(() => getPrismaClient()).toThrow(DatabaseNotConfiguredError);
  });

  it('creates a PrismaClient when DATABASE_URL is provided', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/bet?schema=public';
    const { getPrismaClient, isDatabaseConfigured } = await import('../lib/prisma');
    expect(isDatabaseConfigured()).toBe(true);

    const client = getPrismaClient();
    expect(client).toBeDefined();
    expect(prismaCtor).toHaveBeenCalledTimes(1);

    const reused = getPrismaClient();
    expect(reused).toBe(client);
    expect(prismaCtor).toHaveBeenCalledTimes(1);
  });
});
