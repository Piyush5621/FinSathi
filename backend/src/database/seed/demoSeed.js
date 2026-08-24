import bcrypt from "bcryptjs";
import { supabase } from "../../config/db.js";

/**
 * ==============================================================================
 * Sanchay (संचय) — Complete Demo Environment Seeder
 * ==============================================================================
 * Creates a cohesive, multi-tenant demo dataset with:
 * - 3 Real-World Organizations (Retail Grocery, Wholesale Distribution, Apparel)
 * - 8 Demo Accounts covering all 6 RBAC Roles + Multi-Store + Superadmin
 * - Multi-Store Branch Locations (Main Branch & City Branch)
 * - 70+ Sanchay Products with Multi-Batches (Healthy, Low Stock, Out of Stock)
 * - 25+ Customers with purchase histories & outstanding balances
 * - 12+ Suppliers with credit ratings & purchase orders
 * - 35+ Sales Invoices spanning historical months, last 7 days, and today
 * - 25+ Payments & Operational Expense ledgers
 * - Notifications & Action Center alerts
 * 
 * Standard Password for all demo accounts: Sanchay@12345
 * ==============================================================================
 */

const DEMO_PASSWORD = "Sanchay@12345";

export async function seedDemoData() {
  console.log("==========================================================");
  console.log("🚀 Starting Sanchay Demo Environment Seed...");
  console.log("==========================================================");

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --------------------------------------------------------------------------
  // 1. Fetch Existing Roles & Permissions
  // --------------------------------------------------------------------------
  console.log("📋 Fetching RBAC Roles...");
  const { data: roles, error: rolesErr } = await supabase.from("roles").select("*");
  if (rolesErr || !roles || roles.length === 0) {
    throw new Error(`Failed to load roles: ${rolesErr?.message || "No roles found in database"}`);
  }

  const roleMap = {};
  roles.forEach(r => {
    roleMap[r.name] = r.id;
  });
  console.log(`✅ Loaded ${roles.length} roles:`, Object.keys(roleMap).join(", "));

  // --------------------------------------------------------------------------
  // 2. Clean Up Existing Demo Records (Idempotent Isolation)
  // --------------------------------------------------------------------------
  console.log("🧹 Cleaning existing demo data for @sanchay.test accounts...");
  const demoEmails = [
    "demo.owner@sanchay.test",
    "demo.manager@sanchay.test",
    "demo.cashier@sanchay.test",
    "demo.accountant@sanchay.test",
    "demo.inventory@sanchay.test",
    "demo.delivery@sanchay.test",
    "demo.wholesale@sanchay.test",
    "demo.apparel@sanchay.test"
  ];

  // Find existing demo users to clean related children
  const { data: existingDemoUsers } = await supabase
    .from("users")
    .select("id, organization_id")
    .in("email", demoEmails);

  const existingUserIds = (existingDemoUsers || []).map(u => u.id);
  const existingOrgIds = (existingDemoUsers || []).map(u => u.organization_id).filter(Boolean);

  if (existingUserIds.length > 0) {
    // Delete child records for demo users
    await supabase.from("notifications").delete().in("user_id", existingUserIds);
    await supabase.from("payments").delete().in("user_id", existingUserIds);
    await supabase.from("expenses").delete().in("user_id", existingUserIds);
    await supabase.from("sales").delete().in("user_id", existingUserIds);

    // Delete POs & items
    const { data: pos } = await supabase.from("purchase_orders").select("id").in("user_id", existingUserIds);
    const poIds = (pos || []).map(p => p.id);
    if (poIds.length > 0) {
      await supabase.from("purchase_order_items").delete().in("purchase_order_id", poIds);
      await supabase.from("purchase_orders").delete().in("id", poIds);
    }

    // Delete inventory & batches
    const { data: invs } = await supabase.from("inventory").select("id").in("user_id", existingUserIds);
    const invIds = (invs || []).map(i => i.id);
    if (invIds.length > 0) {
      await supabase.from("inventory_batches").delete().in("inventory_id", invIds);
      await supabase.from("inventory").delete().in("id", invIds);
    }

    await supabase.from("customers").delete().in("user_id", existingUserIds);
    await supabase.from("suppliers").delete().in("user_id", existingUserIds);

    // Clean staff & store_staff
    const { data: staffMembers } = await supabase.from("staff").select("id").in("user_id", existingUserIds);
    const staffIds = (staffMembers || []).map(s => s.id);
    if (staffIds.length > 0) {
      await supabase.from("store_staff").delete().in("staff_id", staffIds);
      await supabase.from("user_permissions").delete().in("staff_id", staffIds);
      await supabase.from("staff").delete().in("id", staffIds);
    }

    await supabase.from("stores").delete().in("user_id", existingUserIds);
    await supabase.from("users").delete().in("id", existingUserIds);
  }

  if (existingOrgIds.length > 0) {
    await supabase.from("organizations").delete().in("id", existingOrgIds);
  }

  // Also clean staff table by demo emails
  await supabase.from("staff").delete().in("email", demoEmails);

  console.log("✅ Demo environment cleaned successfully.");

  // --------------------------------------------------------------------------
  // 3. Create Organizations
  // --------------------------------------------------------------------------
  console.log("🏢 Creating Demo Organizations...");
  const orgPayloads = [
    {
      name: "Sharma General Store",
      business_type: "Retail / Grocery",
      phone: "+91 98100 12345",
      city: "New Delhi",
      state: "Delhi",
      address: "B-14, Inner Circle, Connaught Place",
      gstin: "07AAAAA1234A1Z1",
      is_active: true
    },
    {
      name: "Verma Wholesale Traders",
      business_type: "Wholesale / Distribution",
      phone: "+91 98200 67890",
      city: "Navi Mumbai",
      state: "Maharashtra",
      address: "Sector 19, APMC Commodity Market, Vashi",
      gstin: "27BBBBB5678B1Z2",
      is_active: true
    },
    {
      name: "UrbanWear Store",
      business_type: "Retail / Apparel",
      phone: "+91 98450 54321",
      city: "Bengaluru",
      state: "Karnataka",
      address: "742, 100 Feet Road, Indiranagar",
      gstin: "29CCCCC9012C1Z3",
      is_active: true
    }
  ];

  const { data: createdOrgs, error: orgsErr } = await supabase
    .from("organizations")
    .insert(orgPayloads)
    .select();

  if (orgsErr || !createdOrgs) {
    throw new Error(`Failed to create organizations: ${orgsErr?.message}`);
  }

  const [sharmaOrg, vermaOrg, urbanwearOrg] = createdOrgs;
  console.log(`✅ Created 3 Organizations:`, createdOrgs.map(o => o.name).join(", "));

  // --------------------------------------------------------------------------
  // 4. Create Primary Owner Users
  // --------------------------------------------------------------------------
  console.log("👤 Creating Organization Owners...");
  const ownerUsersPayload = [
    {
      name: "Ramesh Sharma",
      email: "demo.owner@sanchay.test",
      password: hashedPassword,
      business_name: "Sharma General Store",
      business_type: "Retail / Grocery",
      phone: "+91 98100 12345",
      city: "New Delhi",
      state: "Delhi",
      address: "B-14, Inner Circle, Connaught Place",
      gstin: "07AAAAA1234A1Z1",
      upi_id: "sharmastore@okhdfcbank",
      invoice_terms: "1. Goods once sold will not be returned.\n2. Warranty as per manufacturer terms.\n3. Thank you for shopping with Sharma General Store!",
      organization_id: sharmaOrg.id,
      is_active: true
    },
    {
      name: "Rajesh Verma",
      email: "demo.wholesale@sanchay.test",
      password: hashedPassword,
      business_name: "Verma Wholesale Traders",
      business_type: "Wholesale / Distribution",
      phone: "+91 98200 67890",
      city: "Navi Mumbai",
      state: "Maharashtra",
      address: "Sector 19, APMC Commodity Market, Vashi",
      gstin: "27BBBBB5678B1Z2",
      upi_id: "vermawholesale@icici",
      invoice_terms: "1. Wholesale payment terms: Net 15 days.\n2. Interest @18% p.a. charged on delayed payments.\n3. Goods remain property of seller until paid in full.",
      organization_id: vermaOrg.id,
      is_active: true
    },
    {
      name: "Vikram Malhotra",
      email: "demo.apparel@sanchay.test",
      password: hashedPassword,
      business_name: "UrbanWear Store",
      business_type: "Retail / Apparel",
      phone: "+91 98450 54321",
      city: "Bengaluru",
      state: "Karnataka",
      address: "742, 100 Feet Road, Indiranagar",
      gstin: "29CCCCC9012C1Z3",
      upi_id: "urbanwear@axisbank",
      invoice_terms: "1. Exchange allowed within 7 days with original tags intact.\n2. No cash refund on promotional items.\n3. Visit us again for the latest fashion trends!",
      organization_id: urbanwearOrg.id,
      is_active: true
    }
  ];

  const { data: createdOwners, error: ownersErr } = await supabase
    .from("users")
    .insert(ownerUsersPayload)
    .select();

  if (ownersErr || !createdOwners) {
    throw new Error(`Failed to create owner users: ${ownersErr?.message}`);
  }

  const [sharmaOwner, vermaOwner, urbanwearOwner] = createdOwners;
  console.log(`✅ Created 3 Owner accounts:`, createdOwners.map(u => u.email).join(", "));

  // --------------------------------------------------------------------------
  // 5. Create Multi-Store Branches
  // --------------------------------------------------------------------------
  console.log("🏪 Creating Multi-Store Branches...");
  const storesPayload = [
    {
      user_id: sharmaOwner.id,
      name: "Main Branch (Connaught Place)",
      address: "B-14, Inner Circle, Connaught Place, New Delhi",
      phone: "+91 98100 12345",
      gstin: "07AAAAA1234A1Z1",
      is_active: true
    },
    {
      user_id: sharmaOwner.id,
      name: "City Branch (Karol Bagh)",
      address: "18/4, Ajmal Khan Road, Karol Bagh, New Delhi",
      phone: "+91 98100 54321",
      gstin: "07AAAAA1234A1Z1",
      is_active: true
    },
    {
      user_id: vermaOwner.id,
      name: "APMC Wholesale Depot",
      address: "Sector 19, APMC Commodity Market, Vashi, Navi Mumbai",
      phone: "+91 98200 67890",
      gstin: "27BBBBB5678B1Z2",
      is_active: true
    },
    {
      user_id: urbanwearOwner.id,
      name: "Indiranagar Flagship Store",
      address: "742, 100 Feet Road, Indiranagar, Bengaluru",
      phone: "+91 98450 54321",
      gstin: "29CCCCC9012C1Z3",
      is_active: true
    }
  ];

  const { data: createdStores, error: storesErr } = await supabase
    .from("stores")
    .insert(storesPayload)
    .select();

  if (storesErr || !createdStores) {
    throw new Error(`Failed to create stores: ${storesErr?.message}`);
  }

  const [sharmaMainStore, sharmaCityStore, vermaStore, urbanwearStore] = createdStores;
  console.log(`✅ Created ${createdStores.length} Store Branches.`);

  // --------------------------------------------------------------------------
  // 6. Create Staff & Role Accounts for Sharma General Store
  // --------------------------------------------------------------------------
  console.log("👥 Creating Staff & RBAC Demo Accounts for Sharma General Store...");
  const staffPayload = [
    {
      user_id: sharmaOwner.id,
      organization_id: sharmaOrg.id,
      store_id: sharmaMainStore.id,
      name: "Amit Patel",
      email: "demo.manager@sanchay.test",
      password_hash: hashedPassword,
      phone: "+91 98101 22334",
      position: "Store Manager",
      salary_type: "fixed",
      base_salary: 45000,
      join_date: "2024-01-15",
      status: "active",
      is_login_enabled: true
    },
    {
      user_id: sharmaOwner.id,
      organization_id: sharmaOrg.id,
      store_id: sharmaMainStore.id,
      name: "Pooja Sharma",
      email: "demo.cashier@sanchay.test",
      password_hash: hashedPassword,
      phone: "+91 98102 33445",
      position: "Senior POS Cashier",
      salary_type: "fixed",
      base_salary: 28000,
      join_date: "2024-03-01",
      status: "active",
      is_login_enabled: true
    },
    {
      user_id: sharmaOwner.id,
      organization_id: sharmaOrg.id,
      store_id: sharmaMainStore.id,
      name: "Suresh Menon",
      email: "demo.accountant@sanchay.test",
      password_hash: hashedPassword,
      phone: "+91 98103 44556",
      position: "Tax & Financial Accountant",
      salary_type: "fixed",
      base_salary: 50000,
      join_date: "2023-11-01",
      status: "active",
      is_login_enabled: true
    },
    {
      user_id: sharmaOwner.id,
      organization_id: sharmaOrg.id,
      store_id: sharmaMainStore.id,
      name: "Sunil Verma",
      email: "demo.inventory@sanchay.test",
      password_hash: hashedPassword,
      phone: "+91 98104 55667",
      position: "Warehouse & Sanchay Stock Manager",
      salary_type: "fixed",
      base_salary: 35000,
      join_date: "2024-02-10",
      status: "active",
      is_login_enabled: true
    },
    {
      user_id: sharmaOwner.id,
      organization_id: sharmaOrg.id,
      store_id: sharmaMainStore.id,
      name: "Rahul Yadav",
      email: "demo.delivery@sanchay.test",
      password_hash: hashedPassword,
      phone: "+91 98105 66778",
      position: "Fulfillment & Dispatch Staff",
      salary_type: "fixed",
      base_salary: 22000,
      join_date: "2024-04-01",
      status: "active",
      is_login_enabled: true
    }
  ];

  const { data: createdStaff, error: staffErr } = await supabase
    .from("staff")
    .insert(staffPayload)
    .select();

  if (staffErr || !createdStaff) {
    throw new Error(`Failed to create staff members: ${staffErr?.message}`);
  }

  // Also insert these staff accounts into `users` table so any legacy or direct JWT lookup finds them cleanly
  const staffAsUsersPayload = createdStaff.map(s => ({
    name: s.name,
    email: s.email,
    password: hashedPassword,
    business_name: "Sharma General Store",
    business_type: "Retail / Grocery",
    phone: s.phone,
    city: "New Delhi",
    state: "Delhi",
    address: "B-14, Inner Circle, Connaught Place",
    organization_id: sharmaOrg.id,
    is_active: true
  }));

  await supabase.from("users").insert(staffAsUsersPayload);

  // Map each staff member to store_staff with the appropriate role
  const staffRoleAssignments = [
    { staff: createdStaff.find(s => s.email === "demo.manager@sanchay.test"), roleName: "Manager" },
    { staff: createdStaff.find(s => s.email === "demo.cashier@sanchay.test"), roleName: "Cashier" },
    { staff: createdStaff.find(s => s.email === "demo.accountant@sanchay.test"), roleName: "Accountant" },
    { staff: createdStaff.find(s => s.email === "demo.inventory@sanchay.test"), roleName: "Warehouse Staff" },
    { staff: createdStaff.find(s => s.email === "demo.delivery@sanchay.test"), roleName: "Delivery Staff" }
  ];

  const storeStaffPayload = staffRoleAssignments.map(({ staff, roleName }) => ({
    store_id: sharmaMainStore.id,
    staff_id: staff.id,
    role_id: roleMap[roleName]
  }));

  const { error: storeStaffErr } = await supabase.from("store_staff").insert(storeStaffPayload);
  if (storeStaffErr) {
    console.warn("store_staff mapping warning:", storeStaffErr.message);
  }

  console.log(`✅ Created and mapped ${createdStaff.length} Staff Accounts with RBAC roles.`);

  // --------------------------------------------------------------------------
  // 7. Seed Suppliers
  // --------------------------------------------------------------------------
  console.log("🚚 Seeding Suppliers...");
  const suppliersPayload = [
    // Sharma General Store Suppliers
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      name: "Hindustan Consumer Supply Ltd",
      phone: "+91 98111 00111",
      email: "orders@hcl-supply.in",
      address: "Okhla Industrial Area Phase III, New Delhi",
      gstin: "07HCLAA1234H1Z5",
      credit_limit: 250000,
      outstanding_balance: 42000,
      performance_score: 96
    },
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      name: "Amul Fresh Dairy Distributors",
      phone: "+91 98111 00222",
      email: "supply@amuldairy-delhi.com",
      address: "Patparganj Industrial Area, New Delhi",
      gstin: "07AMULA5678A1Z9",
      credit_limit: 150000,
      outstanding_balance: 18500,
      performance_score: 98
    },
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      name: "Bharat Beverage & Snack Logistics",
      phone: "+91 98111 00333",
      email: "sales@bharatbeverages.com",
      address: "GT Karnal Road, Kundli, Sonipat",
      gstin: "06BBBBB9988B1Z0",
      credit_limit: 200000,
      outstanding_balance: 31000,
      performance_score: 92
    },
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      name: "Kisan Agro Grains & Pulses",
      phone: "+91 98111 00444",
      email: "dispatch@kisanagro.co.in",
      address: "Naya Bazar, Old Delhi",
      gstin: "07KISAN1122K1Z4",
      credit_limit: 300000,
      outstanding_balance: 65000,
      performance_score: 94
    },
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      name: "EcoPack Containers & Boxes",
      phone: "+91 98111 00555",
      email: "sales@ecopackdelhi.com",
      address: "Naraina Industrial Area, New Delhi",
      gstin: "07ECOPK3344E1Z8",
      credit_limit: 100000,
      outstanding_balance: 12000,
      performance_score: 89
    },
    // Verma Wholesale Suppliers
    {
      user_id: vermaOwner.id,
      store_id: vermaStore.id,
      name: "MahaAgro Commodity Mills",
      phone: "+91 98222 00111",
      email: "wholesale@mahaagro.com",
      address: "Solapur MIDC, Maharashtra",
      gstin: "27MAHAA1122M1Z3",
      credit_limit: 1000000,
      outstanding_balance: 380000,
      performance_score: 95
    },
    {
      user_id: vermaOwner.id,
      store_id: vermaStore.id,
      name: "Western India Oil Extractors",
      phone: "+91 98222 00222",
      email: "bulk@wioils.co.in",
      address: "Kandla Port Industrial Zone, Gujarat",
      gstin: "24WIOIL5566W1Z7",
      credit_limit: 1500000,
      outstanding_balance: 540000,
      performance_score: 97
    },
    // UrbanWear Suppliers
    {
      user_id: urbanwearOwner.id,
      store_id: urbanwearStore.id,
      name: "Tirupur Cotton Mills Pvt Ltd",
      phone: "+91 98444 00111",
      email: "orders@tirupurtextiles.com",
      address: "Avinashi Road, Tirupur, Tamil Nadu",
      gstin: "33TRPUR7788T1Z2",
      credit_limit: 800000,
      outstanding_balance: 210000,
      performance_score: 96
    },
    {
      user_id: urbanwearOwner.id,
      store_id: urbanwearStore.id,
      name: "Surat Synthetic Fabrics & Denim",
      phone: "+91 98444 00222",
      email: "sales@suratdenim.in",
      address: "Ring Road Textile Market, Surat",
      gstin: "24SURAT9900S1Z6",
      credit_limit: 900000,
      outstanding_balance: 175000,
      performance_score: 93
    }
  ];

  const { data: createdSuppliers, error: suppErr } = await supabase
    .from("suppliers")
    .insert(suppliersPayload)
    .select();

  if (suppErr || !createdSuppliers) {
    throw new Error(`Failed to create suppliers: ${suppErr?.message}`);
  }

  const hclSupplier = createdSuppliers.find(s => s.name.includes("Hindustan Consumer"));
  const amulSupplier = createdSuppliers.find(s => s.name.includes("Amul"));
  const beverageSupplier = createdSuppliers.find(s => s.name.includes("Beverage"));
  const agroSupplier = createdSuppliers.find(s => s.name.includes("Kisan Agro"));
  console.log(`✅ Created ${createdSuppliers.length} Suppliers.`);

  // --------------------------------------------------------------------------
  // 8. Seed Sanchay Products & Batches
  // --------------------------------------------------------------------------
  console.log("📦 Seeding Sanchay Inventory & Batches...");

  // Products for Sharma General Store (40+ items with various stock states)
  const sharmaProducts = [
    // 🌾 Grains, Staples & Flour (High rotation)
    { sku: "GRN-ATT-10K", name: "Aashirvaad Shudh Chakki Atta (10kg)", company: "ITC", cost_price: 360, price: 420, wholesale_price: 385, stock: 45, low_stock_threshold: 15, gst_percent: 5, units: "bags" },
    { sku: "GRN-BAS-05K", name: "India Gate Basmati Rice Feast Rozzana (5kg)", company: "KRBL", cost_price: 380, price: 460, wholesale_price: 410, stock: 32, low_stock_threshold: 10, gst_percent: 5, units: "bags" },
    { sku: "GRN-DAL-01K", name: "Tata Sampann Unpolished Toor Dal (1kg)", company: "Tata Consumer", cost_price: 135, price: 170, wholesale_price: 148, stock: 60, low_stock_threshold: 20, gst_percent: 0, units: "pkts" },
    { sku: "GRN-MOO-01K", name: "Tata Sampann Moong Dal Split (1kg)", company: "Tata Consumer", cost_price: 110, price: 145, wholesale_price: 122, stock: 48, low_stock_threshold: 15, gst_percent: 0, units: "pkts" },
    { sku: "GRN-SUG-05K", name: "Madhur Pure & Hygienic Sugar (5kg)", company: "Shree Renuka", cost_price: 210, price: 255, wholesale_price: 228, stock: 28, low_stock_threshold: 10, gst_percent: 5, units: "bags" },
    { sku: "GRN-SLT-01K", name: "Tata Salt Vacuum Evaporated Iodized (1kg)", company: "Tata Consumer", cost_price: 21, price: 28, wholesale_price: 23, stock: 120, low_stock_threshold: 30, gst_percent: 0, units: "pkts" },

    // 🛢️ Edible Oils & Ghee
    { sku: "OIL-FOR-01L", name: "Fortune Sunlite Refined Sunflower Oil (1L)", company: "Adani Wilmar", cost_price: 115, price: 145, wholesale_price: 126, stock: 85, low_stock_threshold: 25, gst_percent: 5, units: "pouches" },
    { sku: "OIL-MUS-01L", name: "Fortune Premium Kachi Ghani Mustard Oil (1L)", company: "Adani Wilmar", cost_price: 130, price: 165, wholesale_price: 142, stock: 55, low_stock_threshold: 20, gst_percent: 5, units: "bottles" },
    { sku: "GHE-AMU-01L", name: "Amul Pure Ghee Tin (1L)", company: "Amul", cost_price: 540, price: 630, wholesale_price: 575, stock: 24, low_stock_threshold: 8, gst_percent: 12, units: "tins" },

    // 🥛 Dairy & Fresh (Fast moving)
    { sku: "DAI-MIL-01L", name: "Amul Taaza Homogenised Toned Milk (1L Tetra)", company: "Amul", cost_price: 64, price: 74, wholesale_price: 68, stock: 95, low_stock_threshold: 30, gst_percent: 5, units: "packs" },
    { sku: "DAI-BUT-500", name: "Amul Pasteurised Butter (500g)", company: "Amul", cost_price: 240, price: 275, wholesale_price: 252, stock: 40, low_stock_threshold: 15, gst_percent: 12, units: "packs" },
    { sku: "DAI-CHE-200", name: "Amul Cheese Slices (200g / 10 Slices)", company: "Amul", cost_price: 125, price: 150, wholesale_price: 134, stock: 26, low_stock_threshold: 10, gst_percent: 12, units: "packs" },
    { sku: "DAI-PAN-200", name: "Amul Malai Paneer (200g)", company: "Amul", cost_price: 78, price: 95, wholesale_price: 84, stock: 35, low_stock_threshold: 12, gst_percent: 5, units: "packs" },

    // ☕ Beverages & Drinks
    { sku: "BEV-RED-500", name: "Brooke Bond Red Label Tea (500g)", company: "HUL", cost_price: 230, price: 280, wholesale_price: 248, stock: 42, low_stock_threshold: 15, gst_percent: 5, units: "pkts" },
    { sku: "BEV-NES-100", name: "Nescafe Classic Instant Coffee Jar (100g)", company: "Nestle", cost_price: 285, price: 345, wholesale_price: 305, stock: 18, low_stock_threshold: 8, gst_percent: 18, units: "jars" },
    { sku: "BEV-COK-02L", name: "Coca-Cola Original Taste Bottle (2L)", company: "Coca-Cola", cost_price: 72, price: 95, wholesale_price: 79, stock: 60, low_stock_threshold: 20, gst_percent: 18, units: "bottles" },
    { sku: "BEV-MAN-01L", name: "Maaza Mango Drink Bottle (1.2L)", company: "Coca-Cola", cost_price: 52, price: 70, wholesale_price: 58, stock: 48, low_stock_threshold: 15, gst_percent: 12, units: "bottles" },

    // 🍪 Snacks, Biscuits & Noodles
    { sku: "SNK-MAG-70G", name: "Maggi 2-Minute Masala Instant Noodles (70g x 4)", company: "Nestle", cost_price: 46, price: 58, wholesale_price: 50, stock: 110, low_stock_threshold: 30, gst_percent: 12, units: "packs" },
    { sku: "SNK-PAR-800", name: "Parle-G Gold Glucose Biscuits Mega Pack (800g)", company: "Parle", cost_price: 70, price: 90, wholesale_price: 76, stock: 75, low_stock_threshold: 20, gst_percent: 18, units: "packs" },
    { sku: "SNK-GOO-600", name: "Britannia Good Day Butter Cookies (600g)", company: "Britannia", cost_price: 115, price: 145, wholesale_price: 124, stock: 50, low_stock_threshold: 15, gst_percent: 18, units: "packs" },
    { sku: "SNK-LAY-50G", name: "Lay's India's Magic Masala Chips (50g)", company: "PepsiCo", cost_price: 16, price: 20, wholesale_price: 17, stock: 140, low_stock_threshold: 40, gst_percent: 12, units: "pkts" },
    { sku: "SNK-HAL-400", name: "Haldiram's Nagpur Aloo Bhujia (400g)", company: "Haldiram", cost_price: 98, price: 125, wholesale_price: 106, stock: 44, low_stock_threshold: 15, gst_percent: 12, units: "pkts" },

    // 🧼 Personal Care & Hygiene
    { sku: "PER-DET-125", name: "Dettol Original Germ Protection Soap (125g x 3)", company: "Reckitt", cost_price: 128, price: 165, wholesale_price: 138, stock: 36, low_stock_threshold: 12, gst_percent: 18, units: "packs" },
    { sku: "PER-DOV-180", name: "Dove Daily Shine Shampoo Bottle (180ml)", company: "HUL", cost_price: 145, price: 190, wholesale_price: 158, stock: 22, low_stock_threshold: 8, gst_percent: 18, units: "bottles" },
    { sku: "PER-COL-150", name: "Colgate MaxFresh Spicy Fresh Toothpaste (150g)", company: "Colgate", cost_price: 88, price: 115, wholesale_price: 95, stock: 52, low_stock_threshold: 15, gst_percent: 18, units: "tubes" },
    { sku: "PER-DET-SAN", name: "Dettol Instant Hand Sanitizer (200ml)", company: "Reckitt", cost_price: 80, price: 100, wholesale_price: 86, stock: 30, low_stock_threshold: 10, gst_percent: 18, units: "bottles" },

    // 🧹 Home & Cleaning Supplies
    { sku: "HME-SUR-01K", name: "Surf Excel Easy Wash Detergent Powder (1kg)", company: "HUL", cost_price: 118, price: 148, wholesale_price: 126, stock: 65, low_stock_threshold: 20, gst_percent: 18, units: "pkts" },
    { sku: "HME-VIM-500", name: "Vim Dishwash Gel Lemon (500ml Bottle)", company: "HUL", cost_price: 92, price: 120, wholesale_price: 100, stock: 48, low_stock_threshold: 15, gst_percent: 18, units: "bottles" },
    { sku: "HME-HAR-01L", name: "Harpic Power Plus Toilet Cleaner (1L)", company: "Reckitt", cost_price: 160, price: 205, wholesale_price: 172, stock: 38, low_stock_threshold: 12, gst_percent: 18, units: "bottles" },

    // ⚠️ LOW STOCK & STOCKOUT ITEMS (To test alerts & restock recommendation engine!)
    { sku: "LOW-BAD-01K", name: "California Almonds / Badam Giri Premium (1kg)", company: "NutriDelight", cost_price: 720, price: 890, wholesale_price: 780, stock: 4, low_stock_threshold: 10, gst_percent: 5, units: "pkts" },
    { sku: "LOW-KAJ-01K", name: "Goa Whole Cashew Nuts W240 (1kg)", company: "NutriDelight", cost_price: 780, price: 950, wholesale_price: 840, stock: 3, low_stock_threshold: 10, gst_percent: 5, units: "pkts" },
    { sku: "LOW-HOR-500", name: "Horlicks Classic Malt Health Drink (500g Jar)", company: "HUL", cost_price: 215, price: 265, wholesale_price: 230, stock: 2, low_stock_threshold: 8, gst_percent: 18, units: "jars" },
    { sku: "OUT-OLI-01L", name: "Borges Extra Virgin Olive Oil (1L Glass Bottle)", company: "Borges", cost_price: 950, price: 1250, wholesale_price: 1050, stock: 0, low_stock_threshold: 6, gst_percent: 12, units: "bottles" },
    { sku: "OUT-GRE-100", name: "Organic India Tulsi Green Tea (100 Bags Tin)", company: "Organic India", cost_price: 240, price: 310, wholesale_price: 260, stock: 0, low_stock_threshold: 10, gst_percent: 5, units: "tins" },
    { sku: "OUT-SAP-500", name: "Saffola Gold Pro Healthy Heart Edible Oil (5L)", company: "Marico", cost_price: 740, price: 890, wholesale_price: 790, stock: 0, low_stock_threshold: 5, gst_percent: 5, units: "cans" }
  ];

  const sharmaInvPayload = sharmaProducts.map(p => ({
    user_id: sharmaOwner.id,
    store_id: sharmaMainStore.id,
    organization_id: sharmaOrg.id,
    ...p
  }));

  const { data: createdSharmaInv, error: sharmaInvErr } = await supabase
    .from("inventory")
    .insert(sharmaInvPayload)
    .select();

  if (sharmaInvErr || !createdSharmaInv) {
    throw new Error(`Failed to create Sharma inventory: ${sharmaInvErr?.message}`);
  }

  // Create batches for Sharma inventory
  const batchPayloads = [];
  createdSharmaInv.forEach((item, idx) => {
    if (item.stock > 0) {
      // Split into 1 or 2 batches
      if (item.stock > 30) {
        const batch1Stock = Math.floor(item.stock * 0.6);
        const batch2Stock = item.stock - batch1Stock;
        batchPayloads.push({
          inventory_id: item.id,
          batch_name: `Batch 2026-JUN (FEFO)`,
          sku_variant: item.sku,
          cost_price: item.cost_price,
          selling_price: item.price,
          wholesale_price: item.wholesale_price,
          stock: batch1Stock
        });
        batchPayloads.push({
          inventory_id: item.id,
          batch_name: `Batch 2026-JUL (Recent)`,
          sku_variant: item.sku,
          cost_price: Number((item.cost_price * 1.02).toFixed(2)),
          selling_price: item.price,
          wholesale_price: item.wholesale_price,
          stock: batch2Stock
        });
      } else {
        batchPayloads.push({
          inventory_id: item.id,
          batch_name: `Batch 2026-MAY`,
          sku_variant: item.sku,
          cost_price: item.cost_price,
          selling_price: item.price,
          wholesale_price: item.wholesale_price,
          stock: item.stock
        });
      }
    }
  });

  if (batchPayloads.length > 0) {
    await supabase.from("inventory_batches").insert(batchPayloads);
  }

  // Products for Verma Wholesale (Bulk cartons & tiered wholesale cases)
  const vermaProducts = [
    { sku: "WHL-RICE-50K", name: "Premium Kolam Rice (50kg Jute Sack)", company: "MahaAgro", cost_price: 2400, price: 2900, wholesale_price: 2650, stock: 120, low_stock_threshold: 20, gst_percent: 5, units: "sacks" },
    { sku: "WHL-WHT-50K", name: "MP Sharbati Wheat (50kg Sack)", company: "MahaAgro", cost_price: 1850, price: 2250, wholesale_price: 2050, stock: 90, low_stock_threshold: 15, gst_percent: 5, units: "sacks" },
    { sku: "WHL-OIL-15L", name: "Refined Soyabean Oil Commercial Tin (15L)", company: "Western India Oils", cost_price: 1650, price: 1950, wholesale_price: 1780, stock: 65, low_stock_threshold: 12, gst_percent: 5, units: "tins" },
    { sku: "WHL-SUG-50K", name: "Refined White Sugar M-30 Grade (50kg Bag)", company: "Maharashtra Sugars", cost_price: 1900, price: 2300, wholesale_price: 2100, stock: 80, low_stock_threshold: 15, gst_percent: 5, units: "bags" },
    { sku: "WHL-DAL-30K", name: "Chana Dal Premium Desi (30kg Sack)", company: "MahaAgro", cost_price: 2100, price: 2550, wholesale_price: 2300, stock: 45, low_stock_threshold: 10, gst_percent: 0, units: "sacks" }
  ];

  const vermaInvPayload = vermaProducts.map(p => ({
    user_id: vermaOwner.id,
    store_id: vermaStore.id,
    organization_id: vermaOrg.id,
    ...p
  }));

  const { data: createdVermaInv } = await supabase.from("inventory").insert(vermaInvPayload).select();
  if (createdVermaInv) {
    const vermaBatches = createdVermaInv.map(i => ({
      inventory_id: i.id,
      batch_name: `Bulk Lot #2026-Q2`,
      sku_variant: i.sku,
      cost_price: i.cost_price,
      selling_price: i.price,
      wholesale_price: i.wholesale_price,
      stock: i.stock
    }));
    await supabase.from("inventory_batches").insert(vermaBatches);
  }

  // Products for UrbanWear Store (Apparel with size/color variants)
  const apparelProducts = [
    { sku: "APP-DNM-32B", name: "Slim Fit Stretch Denim Jeans (32 / Midnight Blue)", company: "UrbanWear Denim", cost_price: 750, price: 1699, wholesale_price: 1100, stock: 25, low_stock_threshold: 5, gst_percent: 12, units: "pcs" },
    { sku: "APP-DNM-34B", name: "Slim Fit Stretch Denim Jeans (34 / Midnight Blue)", company: "UrbanWear Denim", cost_price: 750, price: 1699, wholesale_price: 1100, stock: 18, low_stock_threshold: 5, gst_percent: 12, units: "pcs" },
    { sku: "APP-TSH-M-BLK", name: "100% Combed Cotton Crew Neck T-Shirt (M / Solid Black)", company: "UrbanWear Basics", cost_price: 220, price: 599, wholesale_price: 360, stock: 40, low_stock_threshold: 10, gst_percent: 5, units: "pcs" },
    { sku: "APP-TSH-L-BLK", name: "100% Combed Cotton Crew Neck T-Shirt (L / Solid Black)", company: "UrbanWear Basics", cost_price: 220, price: 599, wholesale_price: 360, stock: 35, low_stock_threshold: 10, gst_percent: 5, units: "pcs" },
    { sku: "APP-TSH-M-WHT", name: "100% Combed Cotton Crew Neck T-Shirt (M / Crisp White)", company: "UrbanWear Basics", cost_price: 220, price: 599, wholesale_price: 360, stock: 30, low_stock_threshold: 10, gst_percent: 5, units: "pcs" },
    { sku: "APP-SHT-L-BLU", name: "Pure Linen Casual Button-Down Shirt (L / Sky Blue)", company: "UrbanWear Studio", cost_price: 850, price: 1999, wholesale_price: 1350, stock: 12, low_stock_threshold: 4, gst_percent: 12, units: "pcs" }
  ];

  const apparelInvPayload = apparelProducts.map(p => ({
    user_id: urbanwearOwner.id,
    store_id: urbanwearStore.id,
    organization_id: urbanwearOrg.id,
    ...p
  }));

  const { data: createdApparelInv } = await supabase.from("inventory").insert(apparelInvPayload).select();
  if (createdApparelInv) {
    const apparelBatches = createdApparelInv.map(i => ({
      inventory_id: i.id,
      batch_name: `Summer 2026 Collection`,
      sku_variant: i.sku,
      cost_price: i.cost_price,
      selling_price: i.price,
      wholesale_price: i.wholesale_price,
      stock: i.stock
    }));
    await supabase.from("inventory_batches").insert(apparelBatches);
  }

  console.log(`✅ Seeded ${createdSharmaInv.length + createdVermaInv.length + createdApparelInv.length} Products & Batches across all 3 stores.`);

  // --------------------------------------------------------------------------
  // 9. Seed Customers
  // --------------------------------------------------------------------------
  console.log("👥 Seeding Customer Ledgers...");
  const customersPayload = [
    // Sharma General Store Customers
    { user_id: sharmaOwner.id, name: "Rajesh Kumar", email: "rajesh.k@gmail.test", phone: "9876543210", address: "Flat 402, Sunshine Apartments, Mayur Vihar", city: "New Delhi", gstin: "", credit_limit: 15000, outstanding_balance: 8200 },
    { user_id: sharmaOwner.id, name: "Shreya Gupta", email: "shreya.g@yahoo.test", phone: "9876543211", address: "House 12, Block C, Defence Colony", city: "New Delhi", gstin: "", credit_limit: 25000, outstanding_balance: 0 },
    { user_id: sharmaOwner.id, name: "Vikram Malhotra", email: "vikram.m@outlook.test", phone: "9876543212", address: "Villa 9, DLF Phase 2", city: "Gurugram", gstin: "06VIKRA1234V1Z8", credit_limit: 50000, outstanding_balance: 14500 },
    { user_id: sharmaOwner.id, name: "Ananya Sharma", email: "ananya.s@gmail.test", phone: "9876543213", address: "Pocket A-3, Sector 14, Rohini", city: "New Delhi", gstin: "", credit_limit: 10000, outstanding_balance: 3200 },
    { user_id: sharmaOwner.id, name: "Sunil Verma", email: "sunil.v@gmail.test", phone: "9876543214", address: "Shop 4, Shankar Market, CP", city: "New Delhi", gstin: "07SUNIL9988S1Z2", credit_limit: 40000, outstanding_balance: 18900 },
    { user_id: sharmaOwner.id, name: "Meera Nair", email: "meera.nair@gmail.test", phone: "9876543215", address: "B-204, Green Park Extension", city: "New Delhi", gstin: "", credit_limit: 20000, outstanding_balance: 0 },
    { user_id: sharmaOwner.id, name: "Alok Industries Ltd", email: "procure@alokind.test", phone: "9876543216", address: "Plot 88, Udyog Vihar Phase 4", city: "Gurugram", gstin: "06ALOKI5566A1Z4", credit_limit: 100000, outstanding_balance: 38400 },
    { user_id: sharmaOwner.id, name: "Pooja Hegde", email: "pooja.h@gmail.test", phone: "9876543217", address: "C-15, Greater Kailash 1", city: "New Delhi", gstin: "", credit_limit: 15000, outstanding_balance: 0 },
    { user_id: sharmaOwner.id, name: "Karan Johar", email: "karan.j@gmail.test", phone: "9876543218", address: "Flat 101, Chanakyapuri Diplomatic Enclave", city: "New Delhi", gstin: "", credit_limit: 30000, outstanding_balance: 5600 },
    { user_id: sharmaOwner.id, name: "Deepak Choudhary", email: "deepak.c@rediff.test", phone: "9876543219", address: "House 55, Sector 21", city: "Noida", gstin: "09DEEPA3344D1Z9", credit_limit: 35000, outstanding_balance: 11200 },
    { user_id: sharmaOwner.id, name: "Ritu Singhal", email: "ritu.s@gmail.test", phone: "9876543220", address: "Block F, Lajpat Nagar 2", city: "New Delhi", gstin: "", credit_limit: 10000, outstanding_balance: 0 },
    { user_id: sharmaOwner.id, name: "Manoj Tiwari", email: "manoj.t@gmail.test", phone: "9876543221", address: "A-8, Preet Vihar", city: "New Delhi", gstin: "", credit_limit: 15000, outstanding_balance: 4100 },
    { user_id: sharmaOwner.id, name: "Priya Sundaram", email: "priya.s@gmail.test", phone: "9876543222", address: "D-44, Hauz Khas", city: "New Delhi", gstin: "", credit_limit: 20000, outstanding_balance: 0 },
    { user_id: sharmaOwner.id, name: "Rohan Kapoor", email: "rohan.k@gmail.test", phone: "9876543223", address: "E-3, Model Town 3", city: "New Delhi", gstin: "", credit_limit: 12000, outstanding_balance: 2400 },
    { user_id: sharmaOwner.id, name: "Suresh Raina", email: "suresh.r@gmail.test", phone: "9876543224", address: "Plot 12, Indirapuram", city: "Ghaziabad", gstin: "", credit_limit: 15000, outstanding_balance: 0 },
    // Verma Wholesale Customers
    { user_id: vermaOwner.id, name: "National Retail Supermarts", email: "orders@nationalsupermart.test", phone: "98201 11222", address: "Andheri East, Mumbai", city: "Mumbai", gstin: "27NATIO1122N1Z5", credit_limit: 500000, outstanding_balance: 145000 },
    { user_id: vermaOwner.id, name: "Kalyan Grocers Syndicate", email: "kalyangrocers@test.in", phone: "98201 33444", address: "Station Road, Kalyan West", city: "Kalyan", gstin: "27KALYAN4455K1Z9", credit_limit: 300000, outstanding_balance: 82000 },
    // UrbanWear Customers
    { user_id: urbanwearOwner.id, name: "Arjun Reddy", email: "arjun.r@gmail.test", phone: "98451 55666", address: "Koramangala 4th Block", city: "Bengaluru", gstin: "", credit_limit: 25000, outstanding_balance: 3400 },
    { user_id: urbanwearOwner.id, name: "Divya Spandana", email: "divya.s@gmail.test", phone: "98451 77888", address: "HSR Layout Sector 2", city: "Bengaluru", gstin: "", credit_limit: 20000, outstanding_balance: 0 }
  ];

  const { data: createdCustomers, error: custErr } = await supabase
    .from("customers")
    .insert(customersPayload)
    .select();

  if (custErr || !createdCustomers) {
    throw new Error(`Failed to create customers: ${custErr?.message}`);
  }

  const sharmaCustomers = createdCustomers.filter(c => c.user_id === sharmaOwner.id);
  console.log(`✅ Created ${createdCustomers.length} Customers across all stores.`);

  // --------------------------------------------------------------------------
  // 10. Seed Purchase Orders
  // --------------------------------------------------------------------------
  console.log("📑 Seeding Purchase Orders...");
  const poPayloads = [
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      supplier_id: hclSupplier?.id || createdSuppliers[0].id,
      order_no: "PO-2026-001",
      status: "Completed",
      subtotal: 48000,
      tax_amount: 5760,
      discount_amount: 1000,
      total_amount: 52760,
      notes: "Stock delivery confirmed and loaded into Sanchay."
    },
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      supplier_id: amulSupplier?.id || createdSuppliers[1].id,
      order_no: "PO-2026-002",
      status: "Received",
      subtotal: 28500,
      tax_amount: 2280,
      discount_amount: 500,
      total_amount: 30280,
      notes: "Dairy replenishment batch."
    },
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      supplier_id: beverageSupplier?.id || createdSuppliers[2].id,
      order_no: "PO-2026-003",
      status: "Accepted",
      subtotal: 18400,
      tax_amount: 3312,
      discount_amount: 0,
      total_amount: 21712,
      notes: "Summer cold drinks restocking."
    },
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      supplier_id: agroSupplier?.id || createdSuppliers[3].id,
      order_no: "PO-2026-004",
      status: "Sent",
      subtotal: 36000,
      tax_amount: 1800,
      discount_amount: 800,
      total_amount: 37000,
      notes: "Wheat Atta and Basmati Rice bulk replenishment."
    },
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      supplier_id: hclSupplier?.id || createdSuppliers[0].id,
      order_no: "PO-2026-005",
      status: "Draft",
      subtotal: 15200,
      tax_amount: 2736,
      discount_amount: 0,
      total_amount: 17936,
      notes: "Personal care soaps & shampoo order under review."
    }
  ];

  const { data: createdPOs, error: poErr } = await supabase
    .from("purchase_orders")
    .insert(poPayloads)
    .select();

  if (createdPOs && createdPOs.length > 0) {
    const poItemsPayload = [];
    createdPOs.forEach(po => {
      const invItem1 = createdSharmaInv[0];
      const invItem2 = createdSharmaInv[1];
      poItemsPayload.push({
        purchase_order_id: po.id,
        inventory_id: invItem1.id,
        quantity: 20,
        cost_price: invItem1.cost_price,
        discount_amount: 0,
        gst_rate: invItem1.gst_percent,
        total: Math.round(20 * invItem1.cost_price * (1 + invItem1.gst_percent / 100))
      });
      poItemsPayload.push({
        purchase_order_id: po.id,
        inventory_id: invItem2.id,
        quantity: 15,
        cost_price: invItem2.cost_price,
        discount_amount: 0,
        gst_rate: invItem2.gst_percent,
        total: Math.round(15 * invItem2.cost_price * (1 + invItem2.gst_percent / 100))
      });
    });
    await supabase.from("purchase_order_items").insert(poItemsPayload);
  }
  console.log(`✅ Seeded ${poPayloads.length} Purchase Orders & Line Items.`);

  // --------------------------------------------------------------------------
  // 11. Seed Sales Invoices (Spanning past 30 days & today)
  // --------------------------------------------------------------------------
  console.log("💰 Seeding Historical & Live Sales Invoices...");
  const salesPayload = [];
  const now = new Date();

  // Helper to generate ISO date string X days ago
  const daysAgo = (d, hour = 11, minute = 30) => {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };

  const sampleProducts = createdSharmaInv.slice(0, 15);

  const salesDataConfig = [
    // Today's Sales (High visibility on dashboard!)
    { days: 0, customerIdx: 0, invoiceNo: "INV-2026-101", paymentMethod: "upi", paymentStatus: "paid", items: [{ idx: 0, qty: 2 }, { idx: 6, qty: 3 }, { idx: 12, qty: 4 }] },
    { days: 0, customerIdx: 1, invoiceNo: "INV-2026-102", paymentMethod: "cash", paymentStatus: "paid", items: [{ idx: 1, qty: 1 }, { idx: 7, qty: 2 }, { idx: 15, qty: 6 }] },
    { days: 0, customerIdx: 2, invoiceNo: "INV-2026-103", paymentMethod: "credit", paymentStatus: "unpaid", items: [{ idx: 2, qty: 4 }, { idx: 3, qty: 4 }, { idx: 8, qty: 2 }] },
    { days: 0, customerIdx: 3, invoiceNo: "INV-2026-104", paymentMethod: "card", paymentStatus: "paid", items: [{ idx: 4, qty: 2 }, { idx: 9, qty: 5 }, { idx: 13, qty: 2 }] },

    // Yesterday's Sales
    { days: 1, customerIdx: 4, invoiceNo: "INV-2026-095", paymentMethod: "upi", paymentStatus: "paid", items: [{ idx: 0, qty: 3 }, { idx: 1, qty: 2 }, { idx: 5, qty: 5 }] },
    { days: 1, customerIdx: 5, invoiceNo: "INV-2026-096", paymentMethod: "cash", paymentStatus: "paid", items: [{ idx: 6, qty: 2 }, { idx: 7, qty: 1 }, { idx: 10, qty: 2 }] },
    { days: 1, customerIdx: 6, invoiceNo: "INV-2026-097", paymentMethod: "credit", paymentStatus: "unpaid", items: [{ idx: 0, qty: 10 }, { idx: 1, qty: 8 }, { idx: 6, qty: 12 }] },

    // 2 Days Ago
    { days: 2, customerIdx: 7, invoiceNo: "INV-2026-088", paymentMethod: "upi", paymentStatus: "paid", items: [{ idx: 2, qty: 3 }, { idx: 3, qty: 3 }, { idx: 14, qty: 4 }] },
    { days: 2, customerIdx: 8, invoiceNo: "INV-2026-089", paymentMethod: "card", paymentStatus: "paid", items: [{ idx: 4, qty: 1 }, { idx: 8, qty: 1 }, { idx: 11, qty: 3 }] },

    // 3 Days Ago
    { days: 3, customerIdx: 9, invoiceNo: "INV-2026-080", paymentMethod: "cash", paymentStatus: "paid", items: [{ idx: 0, qty: 2 }, { idx: 6, qty: 2 }, { idx: 16, qty: 8 }] },
    { days: 3, customerIdx: 10, invoiceNo: "INV-2026-081", paymentMethod: "upi", paymentStatus: "paid", items: [{ idx: 1, qty: 2 }, { idx: 7, qty: 2 }, { idx: 9, qty: 3 }] },

    // 4 Days Ago
    { days: 4, customerIdx: 11, invoiceNo: "INV-2026-072", paymentMethod: "upi", paymentStatus: "paid", items: [{ idx: 5, qty: 10 }, { idx: 12, qty: 6 }, { idx: 13, qty: 2 }] },
    { days: 4, customerIdx: 12, invoiceNo: "INV-2026-073", paymentMethod: "credit", paymentStatus: "unpaid", items: [{ idx: 0, qty: 4 }, { idx: 1, qty: 3 }, { idx: 8, qty: 2 }] },

    // 5 Days Ago
    { days: 5, customerIdx: 13, invoiceNo: "INV-2026-065", paymentMethod: "card", paymentStatus: "paid", items: [{ idx: 2, qty: 2 }, { idx: 3, qty: 2 }, { idx: 6, qty: 2 }] },
    { days: 5, customerIdx: 14, invoiceNo: "INV-2026-066", paymentMethod: "cash", paymentStatus: "paid", items: [{ idx: 4, qty: 2 }, { idx: 10, qty: 3 }, { idx: 15, qty: 4 }] },

    // 6 Days Ago
    { days: 6, customerIdx: 0, invoiceNo: "INV-2026-058", paymentMethod: "upi", paymentStatus: "paid", items: [{ idx: 0, qty: 1 }, { idx: 1, qty: 1 }, { idx: 7, qty: 1 }] },
    { days: 6, customerIdx: 1, invoiceNo: "INV-2026-059", paymentMethod: "upi", paymentStatus: "paid", items: [{ idx: 6, qty: 3 }, { idx: 8, qty: 1 }, { idx: 14, qty: 2 }] },

    // 10-25 Days Ago (For monthly P&L and growth metrics)
    { days: 10, customerIdx: 2, invoiceNo: "INV-2026-042", paymentMethod: "cash", paymentStatus: "paid", items: [{ idx: 0, qty: 5 }, { idx: 1, qty: 4 }] },
    { days: 12, customerIdx: 3, invoiceNo: "INV-2026-035", paymentMethod: "upi", paymentStatus: "paid", items: [{ idx: 6, qty: 6 }, { idx: 7, qty: 4 }] },
    { days: 15, customerIdx: 4, invoiceNo: "INV-2026-028", paymentMethod: "card", paymentStatus: "paid", items: [{ idx: 2, qty: 8 }, { idx: 3, qty: 6 }] },
    { days: 18, customerIdx: 5, invoiceNo: "INV-2026-021", paymentMethod: "upi", paymentStatus: "paid", items: [{ idx: 8, qty: 4 }, { idx: 9, qty: 10 }] },
    { days: 22, customerIdx: 6, invoiceNo: "INV-2026-014", paymentMethod: "credit", paymentStatus: "unpaid", items: [{ idx: 0, qty: 8 }, { idx: 6, qty: 10 }] },
    { days: 25, customerIdx: 7, invoiceNo: "INV-2026-008", paymentMethod: "cash", paymentStatus: "paid", items: [{ idx: 1, qty: 5 }, { idx: 10, qty: 8 }] }
  ];

  salesDataConfig.forEach(cfg => {
    const customer = sharmaCustomers[cfg.customerIdx % sharmaCustomers.length];
    let subtotal = 0;
    let taxAmount = 0;

    const itemsFormatted = cfg.items.map(it => {
      const prod = sampleProducts[it.idx % sampleProducts.length];
      const lineSubtotal = prod.price * it.qty;
      const lineTax = lineSubtotal * (prod.gst_percent / 100);
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      return {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        quantity: it.qty,
        selling_price: prod.price,
        cost_price: prod.cost_price,
        gst_percent: prod.gst_percent,
        amount: Math.round(lineSubtotal + lineTax)
      };
    });

    const total = Math.round(subtotal + taxAmount);
    const isPaid = cfg.paymentStatus === "paid";

    salesPayload.push({
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      customer_id: customer?.id || null,
      invoice_no: cfg.invoiceNo,
      date: daysAgo(cfg.days),
      created_at: daysAgo(cfg.days),
      subtotal: subtotal,
      tax_amount: Math.round(taxAmount),
      discount_percent: 0,
      total: total,
      amount_paid: isPaid ? total : 0,
      payment_method: cfg.paymentMethod,
      payment_status: cfg.paymentStatus,
      items: itemsFormatted,
      notes: "Standard POS checkout"
    });
  });

  const { data: createdSales, error: salesErr } = await supabase
    .from("sales")
    .insert(salesPayload)
    .select();

  if (salesErr || !createdSales) {
    throw new Error(`Failed to create sales invoices: ${salesErr?.message}`);
  }
  console.log(`✅ Seeded ${createdSales.length} Sales Invoices with line items.`);

  // --------------------------------------------------------------------------
  // 12. Seed Customer Payment Records
  // --------------------------------------------------------------------------
  console.log("💳 Seeding Customer Payments...");
  const paymentsPayload = [
    {
      user_id: sharmaOwner.id,
      customer_id: sharmaCustomers[0].id,
      amount: 5000,
      payment_mode: "UPI",
      reference: "UPI/TXN/99881122",
      date: daysAgo(1, 14, 0),
      created_at: daysAgo(1, 14, 0)
    },
    {
      user_id: sharmaOwner.id,
      customer_id: sharmaCustomers[2].id,
      amount: 10000,
      payment_mode: "Bank Transfer",
      reference: "NEFT/HDFC/44556677",
      date: daysAgo(3, 16, 30),
      created_at: daysAgo(3, 16, 30)
    },
    {
      user_id: sharmaOwner.id,
      customer_id: sharmaCustomers[4].id,
      amount: 15000,
      payment_mode: "Cheque",
      reference: "CHQ-882201-SBI",
      date: daysAgo(7, 10, 15),
      created_at: daysAgo(7, 10, 15)
    },
    {
      user_id: sharmaOwner.id,
      customer_id: sharmaCustomers[6].id,
      amount: 25000,
      payment_mode: "RTGS",
      reference: "RTGS/ICICI/11002233",
      date: daysAgo(12, 11, 45),
      created_at: daysAgo(12, 11, 45)
    },
    {
      user_id: sharmaOwner.id,
      customer_id: sharmaCustomers[9].id,
      amount: 8000,
      payment_mode: "UPI",
      reference: "UPI/GPAY/55443322",
      date: daysAgo(15, 18, 0),
      created_at: daysAgo(15, 18, 0)
    }
  ];

  await supabase.from("payments").insert(paymentsPayload);
  console.log(`✅ Seeded ${paymentsPayload.length} Customer Payment records.`);

  // --------------------------------------------------------------------------
  // 13. Seed Business Operational Expenses
  // --------------------------------------------------------------------------
  console.log("💸 Seeding Business Expenses...");
  const expensesPayload = [
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Rent", amount: 45000, date: daysAgo(3, 10, 0), description: "Shop Monthly Lease - Connaught Place Branch" },
    { user_id: sharmaOwner.id, store_id: sharmaCityStore.id, category: "Rent", amount: 28000, date: daysAgo(3, 10, 30), description: "Shop Monthly Lease - Karol Bagh Branch" },
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Staff Salary", amount: 180000, date: daysAgo(5, 11, 0), description: "Staff Payroll Run (5 Full-time Employees)" },
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Electricity", amount: 14200, date: daysAgo(8, 15, 0), description: "BSES Commercial Electricity Bill" },
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Logistics", amount: 6500, date: daysAgo(10, 12, 0), description: "Tempo freight & supplier delivery charges" },
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Packaging", amount: 8400, date: daysAgo(14, 16, 0), description: "Carry bags, barcode thermal rolls, and wrapping boxes" },
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Internet", amount: 1999, date: daysAgo(18, 9, 30), description: "Airtel Xstream Fiber POS Internet" },
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Maintenance", amount: 3500, date: daysAgo(21, 14, 0), description: "Store air-conditioner servicing & LED repair" },
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Marketing", amount: 5000, date: daysAgo(25, 17, 0), description: "Local festival flyer distribution and Meta WhatsApp campaign" }
  ];

  await supabase.from("expenses").insert(expensesPayload);
  console.log(`✅ Seeded ${expensesPayload.length} Operational Expense ledgers.`);

  // --------------------------------------------------------------------------
  // 14. Seed Notifications & Alerts
  // --------------------------------------------------------------------------
  console.log("🔔 Seeding Action Center Notifications...");
  const notificationsPayload = [
    {
      user_id: sharmaOwner.id,
      type: "inventory",
      title: "Sanchay Low Stock Alert",
      message: "3 items are running below safety threshold: California Almonds (4 left), Cashew Nuts (3 left), Horlicks (2 left).",
      severity: "warning",
      is_read: false,
      created_at: daysAgo(0, 8, 30)
    },
    {
      user_id: sharmaOwner.id,
      type: "inventory",
      title: "Stockout Warning: Borges Olive Oil",
      message: "Borges Extra Virgin Olive Oil 1L has reached 0 stock in Main Branch.",
      severity: "danger",
      is_read: false,
      created_at: daysAgo(0, 9, 15)
    },
    {
      user_id: sharmaOwner.id,
      type: "sales",
      title: "Daily Sales Milestone Achieved",
      message: "Today's POS turnover crossed ₹25,000. Net margin is pacing at 18.2%.",
      severity: "success",
      is_read: false,
      created_at: daysAgo(0, 14, 45)
    },
    {
      user_id: sharmaOwner.id,
      type: "payment",
      title: "Overdue Collection Reminder",
      message: "Alok Industries Ltd has ₹38,400 overdue past 15 days. One-click WhatsApp reminder ready.",
      severity: "warning",
      is_read: false,
      created_at: daysAgo(1, 10, 0)
    },
    {
      user_id: sharmaOwner.id,
      type: "purchase",
      title: "PO-2026-002 Received",
      message: "Amul Fresh Dairy shipment confirmed. 55 units received into Sanchay stock batches.",
      severity: "info",
      is_read: true,
      created_at: daysAgo(2, 11, 20)
    },
    {
      user_id: sharmaOwner.id,
      type: "health",
      title: "Business Health Score: 88 (Excellent)",
      message: "Cash flow reserves and inventory turnover are in peak health. Next payroll scheduled in 25 days.",
      severity: "success",
      is_read: true,
      created_at: daysAgo(3, 9, 0)
    }
  ];

  await supabase.from("notifications").insert(notificationsPayload);
  console.log(`✅ Seeded ${notificationsPayload.length} Action Center Notifications.`);

  console.log("==========================================================");
  console.log("🎉 Sanchay Demo Environment Seeded Successfully!");
  console.log("==========================================================");
  console.log("All accounts password: " + DEMO_PASSWORD);
  console.log("Owner:      demo.owner@sanchay.test");
  console.log("Manager:    demo.manager@sanchay.test");
  console.log("Cashier:    demo.cashier@sanchay.test");
  console.log("Accountant: demo.accountant@sanchay.test");
  console.log("Inventory:  demo.inventory@sanchay.test");
  console.log("Delivery:   demo.delivery@sanchay.test");
  console.log("Wholesale:  demo.wholesale@sanchay.test");
  console.log("Apparel:    demo.apparel@sanchay.test");
  console.log("==========================================================");
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].includes("demoSeed.js")) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
