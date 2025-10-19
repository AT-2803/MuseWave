import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.apiKey.findFirst({ where: { key: 'dev-key' } });
    if (!existing) {
      await prisma.apiKey.create({ data: { name: 'Development', key: 'dev-key', userId: 'dev-user', rateLimitPerMin: 120 } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seed script failed', error);
  process.exitCode = 1;
});
