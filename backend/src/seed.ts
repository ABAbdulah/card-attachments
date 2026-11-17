import { prisma } from './lib/prisma.js';
import { seedMerchants } from './modules/merchants/seed.js';

const count = await seedMerchants();
console.log(`Seeded ${count} merchants.`);
await prisma.$disconnect();
