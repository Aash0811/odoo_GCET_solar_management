const prisma = require('../src/config/prisma');

async function assignUniqueCodes() {
  console.log('--- Assigning Unique Barcode & Serial Codes for Every Item ---');

  const company = await prisma.company.findFirst();
  if (!company) {
    console.error('No company found.');
    return;
  }

  const products = await prisma.product.findMany({
    where: { companyId: company.id },
    include: {
      serialNumbers: true
    }
  });

  console.log(`Found ${products.length} products for company: ${company.name}`);

  const currentYear = new Date().getFullYear();
  let totalCreatedSerials = 0;

  for (const product of products) {
    console.log(`\nProcessing: [${product.sku}] ${product.name} (Serial Tracked: ${product.isSerialTracked})`);

    if (product.isSerialTracked) {
      const existingSerials = product.serialNumbers.map(s => s.serial);
      const targetCount = 10;
      const needToCreate = Math.max(0, targetCount - existingSerials.length);

      if (needToCreate > 0) {
        console.log(`  -> Generating ${needToCreate} unique serial codes...`);
        const cleanSku = product.sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        
        const serialsToCreate = [];
        let counter = 1;
        while (serialsToCreate.length < needToCreate) {
          const serialCandidate = `SN-${cleanSku}-${currentYear}-${String(counter).padStart(4, '0')}`;
          if (!existingSerials.includes(serialCandidate)) {
            serialsToCreate.push({
              companyId: company.id,
              productId: product.id,
              serial: serialCandidate,
              status: 'IN_STOCK'
            });
            existingSerials.push(serialCandidate);
          }
          counter++;
        }

        await prisma.serialNumber.createMany({
          data: serialsToCreate,
          skipDuplicates: true
        });

        totalCreatedSerials += serialsToCreate.length;
        console.log(`  -> Created ${serialsToCreate.length} serials. Sample: ${serialsToCreate[0].serial}`);
      } else {
        console.log(`  -> Already has ${existingSerials.length} serials. Sample: ${existingSerials[0]}`);
      }
    } else {
      console.log(`  -> Non-serial tracked hardware item. Master barcode: [${product.sku}]`);
    }
  }

  console.log(`\nSuccessfully assigned and generated ${totalCreatedSerials} new unique serial barcodes!`);
  const finalCount = await prisma.serialNumber.count({ where: { companyId: company.id } });
  console.log(`Total serial numbers in system: ${finalCount}`);
}

assignUniqueCodes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

