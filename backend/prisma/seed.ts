import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a development API key
  const apiKey = await prisma.apiKey.upsert({
    where: { key: 'dev-key-12345' },
    update: {},
    create: {
      key: 'dev-key-12345',
      name: 'Development API Key',
    },
  });

  console.log('Created API key:', apiKey.key);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });