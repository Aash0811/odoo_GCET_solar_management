const prisma = require("../config/prisma");

let cachedCompany = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Returns the single active company for SunPower Solutions.
 * Automatically initializes if not present.
 */
async function getSingleCompany() {
  const now = Date.now();
  if (cachedCompany && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedCompany;
  }

  // 1. Look for SunPower or first active company
  let company = await prisma.company.findFirst({
    where: {
      OR: [
        { slug: "sunpower" },
        { name: { contains: "SunPower", mode: "insensitive" } },
        { isActive: true },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. If not found in database, seed default single company
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "SunPower Solutions Pvt Ltd",
        slug: "sunpower",
        email: "info@sunpowersolutions.com",
        phone: "+91 98765 00000",
        address: "Plot 42, Energy Park, Hyderabad, Telangana 500081",
        gstNumber: "36AABCS1234F1Z8",
        isActive: true,
      },
    });
  }

  cachedCompany = company;
  lastFetchTime = now;
  return company;
}

/**
 * Update single company details
 */
async function updateSingleCompany(data) {
  const current = await getSingleCompany();
  const updated = await prisma.company.update({
    where: { id: current.id },
    data: {
      name: data.name !== undefined ? data.name : current.name,
      email: data.email !== undefined ? data.email : current.email,
      phone: data.phone !== undefined ? data.phone : current.phone,
      address: data.address !== undefined ? data.address : current.address,
      gstNumber: data.gstNumber !== undefined ? data.gstNumber : current.gstNumber,
      isActive: true,
    },
  });

  cachedCompany = updated;
  lastFetchTime = Date.now();
  return updated;
}

function clearCompanyCache() {
  cachedCompany = null;
  lastFetchTime = 0;
}

module.exports = {
  getSingleCompany,
  updateSingleCompany,
  clearCompanyCache,
};

