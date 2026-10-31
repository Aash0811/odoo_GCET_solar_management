const prisma = require("../src/config/prisma");

async function seedWarehouses() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log("No company found.");
    return;
  }

  const products = await prisma.product.findMany({
    where: { companyId: company.id },
  });

  console.log(`Found ${products.length} products for company ${company.name}`);

  const warehousesData = [
    {
      name: "Hyderabad West Solar Logistics Hub",
      code: "WH-HYD-WEST",
      city: "Hyderabad",
      zone: "Zone-1 West",
      address: "Plot 42, Hitec City Phase 2, Madhapur, Hyderabad, Telangana 500081",
      contactPerson: "Ramesh Sharma",
      phone: "+91 98490 11223",
    },
    {
      name: "Hyderabad East Distribution Depot",
      code: "WH-HYD-EAST",
      city: "Hyderabad",
      zone: "Zone-2 East",
      address: "Shed 15, IDA Uppal, Hyderabad, Telangana 500039",
      contactPerson: "Kiran Varma",
      phone: "+91 98490 44556",
    },
    {
      name: "Bengaluru South Regional Depot",
      code: "WH-BLR-SOUTH",
      city: "Bengaluru",
      zone: "Zone-South",
      address: "Industrial Area Phase 1, Electronic City, Bengaluru, Karnataka 560100",
      contactPerson: "Anand Rao",
      phone: "+91 99800 77889",
    },
  ];

  for (const whData of warehousesData) {
    const warehouse = await prisma.warehouse.upsert({
      where: {
        companyId_city_zone: {
          companyId: company.id,
          city: whData.city,
          zone: whData.zone,
        },
      },
      update: {
        name: whData.name,
        code: whData.code,
        address: whData.address,
        contactPerson: whData.contactPerson,
        phone: whData.phone,
      },
      create: {
        ...whData,
        companyId: company.id,
      },
    });

    console.log(`Upserted Warehouse: ${warehouse.name} [City: ${warehouse.city}, Zone: ${warehouse.zone}]`);

    // Add stock for each product
    for (const prod of products) {
      let qty = 0;
      if (whData.code === "WH-HYD-WEST") {
        // Main warehouse - well stocked
        qty = Math.floor(Number(prod.stockQty) * 0.7);
      } else if (whData.code === "WH-HYD-EAST") {
        // East depot - limited stock, some items intentionally 0 to test pick restriction!
        if (prod.category === "BATTERY" || prod.sku.includes("OFFGRID") || prod.sku.includes("BIFACIAL")) {
          qty = 0; // NOT IN STOCK! Cannot be picked!
        } else {
          qty = Math.max(1, Math.floor(Number(prod.stockQty) * 0.3));
        }
      } else {
        // Bengaluru - regional
        if (prod.sku.includes("HYBRID") || prod.sku.includes("ELEVATED")) {
          qty = 0; // NOT IN STOCK!
        } else {
          qty = 15;
        }
      }

      await prisma.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: prod.id,
          },
        },
        update: {
          quantity: qty,
        },
        create: {
          warehouseId: warehouse.id,
          productId: prod.id,
          quantity: qty,
          minQuantity: 5,
        },
      });
    }
  }

  // Also assign default warehouse (Hyderabad West) to existing open PickLists if not assigned
  const defaultWarehouse = await prisma.warehouse.findFirst({
    where: { companyId: company.id, code: "WH-HYD-WEST" },
  });

  if (defaultWarehouse) {
    await prisma.pickList.updateMany({
      where: { companyId: company.id, warehouseId: null },
      data: { warehouseId: defaultWarehouse.id },
    });
    console.log(`Assigned default warehouse to existing pick lists.`);
  }

  console.log("Warehouse seeding completed successfully!");
}

seedWarehouses()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

