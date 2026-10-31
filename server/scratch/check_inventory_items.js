const prisma = require('../src/config/prisma');

async function check() {
  const products = await prisma.product.findMany({
    include: {
      _count: { select: { serialNumbers: true } },
      serialNumbers: { take: 5 }
    }
  });

  console.log('Total Products in Database:', products.length);
  for (const p of products) {
    console.log(`- Product [${p.sku}] "${p.name}" (Tracked: ${p.isSerialTracked}, Serials: ${p._count.serialNumbers})`);
    if (p.serialNumbers.length > 0) {
      console.log('   Sample Serials:', p.serialNumbers.map(s => s.serial).join(', '));
    }
  }

  const totalSerials = await prisma.serialNumber.count();
  console.log('\nTotal Serial Numbers in Database:', totalSerials);
}

check().catch(console.error).finally(() => prisma.$disconnect());

