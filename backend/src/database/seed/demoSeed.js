import bcrypt from "bcryptjs";
import { supabase } from "../../config/db.js";

/**
 * ==============================================================================
 * Karobar (कारोबार) — Complete Demo Environment Seeder
 * ==============================================================================
 * Creates a cohesive, multi-tenant demo dataset with:
 * - 5 Real-World Organizations (Retail Grocery, Wholesale Distribution, Apparel, FMCG Dist, Packaging)
 * - 10 Demo Accounts covering all RBAC Roles + Multi-Store + Network Partners
 * - Multi-Store Branch Locations (Main Branch & City Branch)
 * - 70+ Products with Multi-Batches (Healthy, Low Stock, Out of Stock)
 * - 25+ Customers with purchase histories & outstanding balances
 * - 12+ Suppliers with credit ratings & purchase orders
 * - 35+ Sales Invoices spanning historical months, last 7 days, and today
 * - 25+ Payments & Operational Expense ledgers
 * - Complete 5-Pillar Karobar Business Network:
 *   1. Partners: 3 Connected (Supplier, Buyer, Partner) + 1 Pending Invite
 *   2. Trade Inbox: 4 Digital Bills (Pending, Viewed, Imported, Rejected)
 *   3. Trade Outbox: 3 Sent Invoices (Accepted, Viewed, Pending)
 *   4. Trade Credit: Credit Given (₹1L limit, due in 6d) & Credit Received (₹2.5L & ₹1.5L)
 *   5. Trust Scores: Multi-pillar scores (88–94) with full metric breakdown & history
 * 
 * Standard Password for all demo accounts: Karobar@12345
 * ==============================================================================
 */

const DEMO_PASSWORD = "Karobar@12345";

export async function seedDemoData() {
  console.log("==========================================================");
  console.log("🚀 Starting Karobar Demo Environment Seed...");
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
  console.log("🧹 Cleaning existing demo data for @karobar.test accounts...");
  const demoEmails = [
    "demo.owner@karobar.test",
    "demo.manager@karobar.test",
    "demo.cashier@karobar.test",
    "demo.accountant@karobar.test",
    "demo.inventory@karobar.test",
    "demo.delivery@karobar.test",
    "demo.wholesale@karobar.test",
    "demo.apparel@karobar.test",
    "demo.distributor@karobar.test",
    "demo.packaging@karobar.test",
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

    // Clean Business Network Records (Invoices, Items, Connections, Credit, Reputation)
    const { data: txs } = await supabase
      .from("trade_transactions")
      .select("id")
      .or(`sender_id.in.(${existingUserIds.join(",")}),receiver_id.in.(${existingUserIds.join(",")})`);
    
    const txIds = (txs || []).map(t => t.id);
    if (txIds.length > 0) {
      await supabase.from("trade_transaction_items").delete().in("transaction_id", txIds);
      await supabase.from("trade_transactions").delete().in("id", txIds);
    }

    await supabase.from("business_connections").delete().or(`requester_id.in.(${existingUserIds.join(",")}),receiver_id.in.(${existingUserIds.join(",")})`);
    await supabase.from("trade_credit_accounts").delete().or(`supplier_id.in.(${existingUserIds.join(",")}),buyer_id.in.(${existingUserIds.join(",")})`);
    await supabase.from("business_reputation_metrics").delete().in("user_id", existingUserIds);
    await supabase.from("business_reputation_history").delete().in("user_id", existingUserIds);
    await supabase.from("business_network_profiles").delete().in("user_id", existingUserIds);

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
    },
    {
      name: "Gupta FMCG & Dairy Distributors",
      business_type: "Wholesale / FMCG",
      phone: "+91 98111 88990",
      city: "New Delhi",
      state: "Delhi",
      address: "GT Karnal Road Industrial Area, Azadpur",
      gstin: "07GUPTA4455G1Z8",
      is_active: true
    },
    {
      name: "Apex Bio-Packaging Solutions",
      business_type: "Manufacturing / Packaging",
      phone: "+91 98122 33445",
      city: "Gurugram",
      state: "Haryana",
      address: "Plot 42, Udyog Vihar Phase 2",
      gstin: "06APEXB7788A1Z5",
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

  const [sharmaOrg, vermaOrg, urbanwearOrg, guptaOrg, apexOrg] = createdOrgs;
  console.log(`✅ Created 5 Organizations:`, createdOrgs.map(o => o.name).join(", "));

  // --------------------------------------------------------------------------
  // 4. Create Primary Owner Users
  // --------------------------------------------------------------------------
  console.log("👤 Creating Organization Owners...");
  const ownerUsersPayload = [
    {
      name: "Ramesh Sharma",
      email: "demo.owner@karobar.test",
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
      email: "demo.wholesale@karobar.test",
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
      email: "demo.apparel@karobar.test",
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
    },
    {
      name: "Sanjay Gupta",
      email: "demo.distributor@karobar.test",
      password: hashedPassword,
      business_name: "Gupta FMCG & Dairy Distributors",
      business_type: "Wholesale / FMCG",
      phone: "+91 98111 88990",
      city: "New Delhi",
      state: "Delhi",
      address: "GT Karnal Road Industrial Area, Azadpur",
      gstin: "07GUPTA4455G1Z8",
      upi_id: "guptafmcg@sbi",
      invoice_terms: "1. FMCG & Dairy distribution invoice.\n2. Net 21 days trade credit.",
      organization_id: guptaOrg.id,
      is_active: true
    },
    {
      name: "Manish Agarwal",
      email: "demo.packaging@karobar.test",
      password: hashedPassword,
      business_name: "Apex Bio-Packaging Solutions",
      business_type: "Manufacturing / Packaging",
      phone: "+91 98122 33445",
      city: "Gurugram",
      state: "Haryana",
      address: "Plot 42, Udyog Vihar Phase 2",
      gstin: "06APEXB7788A1Z5",
      upi_id: "apexpack@kotak",
      invoice_terms: "1. Eco-friendly packaging supplies.\n2. Payment within 15 days of delivery.",
      organization_id: apexOrg.id,
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

  const [sharmaOwner, vermaOwner, urbanwearOwner, guptaOwner, apexOwner] = createdOwners;
  console.log(`✅ Created 5 Business Owner accounts:`, createdOwners.map(u => u.email).join(", "));

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
      email: "demo.manager@karobar.test",
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
      email: "demo.cashier@karobar.test",
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
      email: "demo.accountant@karobar.test",
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
      email: "demo.inventory@karobar.test",
      password_hash: hashedPassword,
      phone: "+91 98104 55667",
      position: "Warehouse & Stock Manager",
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
      email: "demo.delivery@karobar.test",
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

  // Insert staff accounts into `users` table so direct JWT lookups find them cleanly
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
    { staff: createdStaff.find(s => s.email === "demo.manager@karobar.test"), roleName: "Manager" },
    { staff: createdStaff.find(s => s.email === "demo.cashier@karobar.test"), roleName: "Cashier" },
    { staff: createdStaff.find(s => s.email === "demo.accountant@karobar.test"), roleName: "Accountant" },
    { staff: createdStaff.find(s => s.email === "demo.inventory@karobar.test"), roleName: "Warehouse Staff" },
    { staff: createdStaff.find(s => s.email === "demo.delivery@karobar.test"), roleName: "Delivery Staff" }
  ];

  const storeStaffPayload = staffRoleAssignments.map(({ staff, roleName }) => ({
    store_id: sharmaMainStore.id,
    staff_id: staff.id,
    role_id: roleMap[roleName]
  }));

  await supabase.from("store_staff").insert(storeStaffPayload).catch(() => {});

  console.log(`✅ Created and mapped ${createdStaff.length} Staff Accounts with RBAC roles.`);

  // --------------------------------------------------------------------------
  // 7. Seed Suppliers
  // --------------------------------------------------------------------------
  console.log("🚚 Seeding Suppliers...");
  const suppliersPayload = [
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
    }
  ];

  const { data: createdSuppliers } = await supabase.from("suppliers").insert(suppliersPayload).select();
  const hclSupplier = createdSuppliers?.[0];
  const amulSupplier = createdSuppliers?.[1];
  const beverageSupplier = createdSuppliers?.[2];
  const agroSupplier = createdSuppliers?.[3];

  // --------------------------------------------------------------------------
  // 8. Seed Products & Batches
  // --------------------------------------------------------------------------
  console.log("📦 Seeding Inventory & Batches...");

  const sharmaProducts = [
    { sku: "GRN-ATT-10K", name: "Aashirvaad Shudh Chakki Atta (10kg)", company: "ITC", cost_price: 360, price: 420, wholesale_price: 385, stock: 45, low_stock_threshold: 15, gst_percent: 5, units: "bags" },
    { sku: "GRN-BAS-05K", name: "India Gate Basmati Rice Feast Rozzana (5kg)", company: "KRBL", cost_price: 380, price: 460, wholesale_price: 410, stock: 32, low_stock_threshold: 10, gst_percent: 5, units: "bags" },
    { sku: "GRN-DAL-01K", name: "Tata Sampann Unpolished Toor Dal (1kg)", company: "Tata Consumer", cost_price: 135, price: 170, wholesale_price: 148, stock: 60, low_stock_threshold: 20, gst_percent: 0, units: "pkts" },
    { sku: "GRN-MOO-01K", name: "Tata Sampann Moong Dal Split (1kg)", company: "Tata Consumer", cost_price: 110, price: 145, wholesale_price: 122, stock: 48, low_stock_threshold: 15, gst_percent: 0, units: "pkts" },
    { sku: "GRN-SUG-05K", name: "Madhur Pure & Hygienic Sugar (5kg)", company: "Shree Renuka", cost_price: 210, price: 255, wholesale_price: 228, stock: 28, low_stock_threshold: 10, gst_percent: 5, units: "bags" },
    { sku: "GRN-SLT-01K", name: "Tata Salt Vacuum Evaporated Iodized (1kg)", company: "Tata Consumer", cost_price: 21, price: 28, wholesale_price: 23, stock: 120, low_stock_threshold: 30, gst_percent: 0, units: "pkts" },
    { sku: "OIL-FOR-01L", name: "Fortune Sunlite Refined Sunflower Oil (1L)", company: "Adani Wilmar", cost_price: 115, price: 145, wholesale_price: 126, stock: 85, low_stock_threshold: 25, gst_percent: 5, units: "pouches" },
    { sku: "OIL-MUS-01L", name: "Fortune Premium Kachi Ghani Mustard Oil (1L)", company: "Adani Wilmar", cost_price: 130, price: 165, wholesale_price: 142, stock: 55, low_stock_threshold: 20, gst_percent: 5, units: "bottles" },
    { sku: "GHE-AMU-01L", name: "Amul Pure Ghee Tin (1L)", company: "Amul", cost_price: 540, price: 630, wholesale_price: 575, stock: 24, low_stock_threshold: 8, gst_percent: 12, units: "tins" },
    { sku: "DAI-MIL-01L", name: "Amul Taaza Homogenised Toned Milk (1L Tetra)", company: "Amul", cost_price: 64, price: 74, wholesale_price: 68, stock: 95, low_stock_threshold: 30, gst_percent: 5, units: "packs" },
    { sku: "DAI-BUT-500", name: "Amul Pasteurised Butter (500g)", company: "Amul", cost_price: 240, price: 275, wholesale_price: 252, stock: 40, low_stock_threshold: 15, gst_percent: 12, units: "packs" },
    { sku: "DAI-CHE-200", name: "Amul Cheese Slices (200g / 10 Slices)", company: "Amul", cost_price: 125, price: 150, wholesale_price: 134, stock: 26, low_stock_threshold: 10, gst_percent: 12, units: "packs" },
    { sku: "DAI-PAN-200", name: "Amul Malai Paneer (200g)", company: "Amul", cost_price: 78, price: 95, wholesale_price: 84, stock: 35, low_stock_threshold: 12, gst_percent: 5, units: "packs" },
    { sku: "BEV-RED-500", name: "Brooke Bond Red Label Tea (500g)", company: "HUL", cost_price: 230, price: 280, wholesale_price: 248, stock: 42, low_stock_threshold: 15, gst_percent: 5, units: "pkts" },
    { sku: "BEV-NES-100", name: "Nescafe Classic Instant Coffee Jar (100g)", company: "Nestle", cost_price: 285, price: 345, wholesale_price: 305, stock: 18, low_stock_threshold: 8, gst_percent: 18, units: "jars" },
    { sku: "BEV-COK-02L", name: "Coca-Cola Original Taste Bottle (2L)", company: "Coca-Cola", cost_price: 72, price: 95, wholesale_price: 79, stock: 60, low_stock_threshold: 20, gst_percent: 18, units: "bottles" },
    { sku: "BEV-MAN-01L", name: "Maaza Mango Drink Bottle (1.2L)", company: "Coca-Cola", cost_price: 52, price: 70, wholesale_price: 58, stock: 48, low_stock_threshold: 15, gst_percent: 12, units: "bottles" },
    { sku: "SNK-MAG-70G", name: "Maggi 2-Minute Masala Instant Noodles (70g x 4)", company: "Nestle", cost_price: 46, price: 58, wholesale_price: 50, stock: 110, low_stock_threshold: 30, gst_percent: 12, units: "packs" },
    { sku: "SNK-PAR-800", name: "Parle-G Gold Glucose Biscuits Mega Pack (800g)", company: "Parle", cost_price: 70, price: 90, wholesale_price: 76, stock: 75, low_stock_threshold: 20, gst_percent: 18, units: "packs" },
    { sku: "SNK-GOO-600", name: "Britannia Good Day Butter Cookies (600g)", company: "Britannia", cost_price: 115, price: 145, wholesale_price: 124, stock: 50, low_stock_threshold: 15, gst_percent: 18, units: "packs" },
    { sku: "SNK-LAY-50G", name: "Lay's India's Magic Masala Chips (50g)", company: "PepsiCo", cost_price: 16, price: 20, wholesale_price: 17, stock: 140, low_stock_threshold: 40, gst_percent: 12, units: "pkts" },
    { sku: "SNK-HAL-400", name: "Haldiram's Nagpur Aloo Bhujia (400g)", company: "Haldiram", cost_price: 98, price: 125, wholesale_price: 106, stock: 44, low_stock_threshold: 15, gst_percent: 12, units: "pkts" },
    { sku: "PER-DET-125", name: "Dettol Original Germ Protection Soap (125g x 3)", company: "Reckitt", cost_price: 128, price: 165, wholesale_price: 138, stock: 36, low_stock_threshold: 12, gst_percent: 18, units: "packs" },
    { sku: "PER-DOV-180", name: "Dove Daily Shine Shampoo Bottle (180ml)", company: "HUL", cost_price: 145, price: 190, wholesale_price: 158, stock: 22, low_stock_threshold: 8, gst_percent: 18, units: "bottles" },
    { sku: "PER-COL-150", name: "Colgate MaxFresh Spicy Fresh Toothpaste (150g)", company: "Colgate", cost_price: 88, price: 115, wholesale_price: 95, stock: 52, low_stock_threshold: 15, gst_percent: 18, units: "tubes" },
    { sku: "PER-DET-SAN", name: "Dettol Instant Hand Sanitizer (200ml)", company: "Reckitt", cost_price: 80, price: 100, wholesale_price: 86, stock: 30, low_stock_threshold: 10, gst_percent: 18, units: "bottles" },
    { sku: "HME-SUR-01K", name: "Surf Excel Easy Wash Detergent Powder (1kg)", company: "HUL", cost_price: 118, price: 148, wholesale_price: 126, stock: 65, low_stock_threshold: 20, gst_percent: 18, units: "pkts" },
    { sku: "HME-VIM-500", name: "Vim Dishwash Gel Lemon (500ml Bottle)", company: "HUL", cost_price: 92, price: 120, wholesale_price: 100, stock: 48, low_stock_threshold: 15, gst_percent: 18, units: "bottles" },
    { sku: "HME-HAR-01L", name: "Harpic Power Plus Toilet Cleaner (1L)", company: "Reckitt", cost_price: 160, price: 205, wholesale_price: 172, stock: 38, low_stock_threshold: 12, gst_percent: 18, units: "bottles" },
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

  const { data: createdSharmaInv } = await supabase.from("inventory").insert(sharmaInvPayload).select();

  // Create batches for Sharma inventory
  const batchPayloads = [];
  createdSharmaInv.forEach((item) => {
    if (item.stock > 0) {
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

  // --------------------------------------------------------------------------
  // 9. Seed Customers
  // --------------------------------------------------------------------------
  console.log("👥 Seeding Customer Ledgers...");
  const customersPayload = [
    { user_id: sharmaOwner.id, name: "Rajesh Kumar", email: "rajesh.k@gmail.test", phone: "9876543210", address: "Flat 402, Sunshine Apartments, Mayur Vihar", city: "New Delhi", gstin: "", credit_limit: 15000, outstanding_balance: 8200 },
    { user_id: sharmaOwner.id, name: "Shreya Gupta", email: "shreya.g@yahoo.test", phone: "9876543211", address: "House 12, Block C, Defence Colony", city: "New Delhi", gstin: "", credit_limit: 25000, outstanding_balance: 0 },
    { user_id: sharmaOwner.id, name: "Vikram Malhotra", email: "vikram.m@outlook.test", phone: "9876543212", address: "Villa 9, DLF Phase 2", city: "Gurugram", gstin: "06VIKRA1234V1Z8", credit_limit: 50000, outstanding_balance: 14500 },
    { user_id: sharmaOwner.id, name: "Ananya Sharma", email: "ananya.s@gmail.test", phone: "9876543213", address: "Pocket A-3, Sector 14, Rohini", city: "New Delhi", gstin: "", credit_limit: 10000, outstanding_balance: 3200 },
    { user_id: sharmaOwner.id, name: "Sunil Verma", email: "sunil.v@gmail.test", phone: "9876543214", address: "Shop 4, Shankar Market, CP", city: "New Delhi", gstin: "07SUNIL9988S1Z2", credit_limit: 40000, outstanding_balance: 18900 }
  ];

  const { data: createdCustomers } = await supabase.from("customers").insert(customersPayload).select();
  const sharmaCustomers = createdCustomers || [];

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
      notes: "Stock delivery confirmed and loaded into Karobar."
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
    }
  ];

  await supabase.from("purchase_orders").insert(poPayloads);

  // --------------------------------------------------------------------------
  // 11. Seed Sales Invoices
  // --------------------------------------------------------------------------
  console.log("💰 Seeding Historical & Live Sales Invoices...");
  const now = new Date();
  const daysAgo = (d, hour = 11, minute = 30) => {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };

  const salesPayload = [
    {
      user_id: sharmaOwner.id,
      store_id: sharmaMainStore.id,
      customer_id: sharmaCustomers[0]?.id || null,
      invoice_no: "INV-2026-101",
      date: daysAgo(0),
      created_at: daysAgo(0),
      subtotal: 24500,
      tax_amount: 1225,
      discount_percent: 0,
      total: 25725,
      amount_paid: 25725,
      payment_method: "upi",
      payment_status: "paid",
      items: [
        { name: "Aashirvaad Atta (10kg)", quantity: 2, selling_price: 420, total: 840 },
        { name: "Fortune Sunflower Oil (1L)", quantity: 3, selling_price: 145, total: 435 }
      ],
      notes: "Standard POS checkout"
    }
  ];

  await supabase.from("sales").insert(salesPayload);

  // --------------------------------------------------------------------------
  // 12. Seed Customer Payments & Expenses
  // --------------------------------------------------------------------------
  console.log("💳 Seeding Customer Payments & Expenses...");
  if (sharmaCustomers.length > 0) {
    await supabase.from("payments").insert([
      {
        user_id: sharmaOwner.id,
        customer_id: sharmaCustomers[0].id,
        amount: 5000,
        payment_mode: "UPI",
        reference: "UPI/TXN/99881122",
        date: daysAgo(1, 14, 0),
        created_at: daysAgo(1, 14, 0)
      }
    ]);
  }

  await supabase.from("expenses").insert([
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Rent", amount: 45000, date: daysAgo(3, 10, 0), description: "Shop Monthly Lease - Connaught Place" },
    { user_id: sharmaOwner.id, store_id: sharmaMainStore.id, category: "Staff Salary", amount: 180000, date: daysAgo(5, 11, 0), description: "Staff Payroll Run" }
  ]);

  // --------------------------------------------------------------------------
  // 13. Seed Notifications & Alerts
  // --------------------------------------------------------------------------
  console.log("🔔 Seeding Action Center Notifications...");
  await supabase.from("notifications").insert([
    {
      user_id: sharmaOwner.id,
      type: "inventory",
      title: "Low Stock Alert",
      message: "3 items are running below safety threshold: California Almonds (4 left), Cashew Nuts (3 left), Horlicks (2 left).",
      severity: "warning",
      is_read: false,
      created_at: daysAgo(0, 8, 30)
    },
    {
      user_id: sharmaOwner.id,
      type: "sales",
      title: "Daily Sales Milestone Achieved",
      message: "Today's POS turnover crossed ₹25,000. Net margin is pacing at 18.2%.",
      severity: "success",
      is_read: false,
      created_at: daysAgo(0, 14, 45)
    }
  ]);

  // ==========================================================================
  // 14. SEED KAROBAR BUSINESS NETWORK (5 PILLARS WORKSPACE)
  // ==========================================================================
  console.log("🌐 Seeding Karobar Business Network 5-Pillar Workspace...");

  // A. Profiles for all 5 businesses
  const profilePayloads = [
    {
      user_id: sharmaOwner.id,
      verified_gst: true,
      profile_completeness_pct: 100,
      year_established: 2014,
      about_text: "Premier FMCG and daily essentials kirana & supermarket in Connaught Place, New Delhi.",
      trade_volume_bracket: "₹50L - ₹1Cr",
      website_url: "https://sharmageneral.karobar.in"
    },
    {
      user_id: vermaOwner.id,
      verified_gst: true,
      profile_completeness_pct: 95,
      year_established: 2008,
      about_text: "Leading commodity grains, pulses, and edible oil wholesale distributor in APMC Vashi Market.",
      trade_volume_bracket: "₹1Cr - ₹5Cr",
      website_url: "https://vermawholesale.karobar.in"
    },
    {
      user_id: urbanwearOwner.id,
      verified_gst: true,
      profile_completeness_pct: 90,
      year_established: 2019,
      about_text: "Curated apparel, denim, and cotton garments boutique and retail chain based in Bengaluru.",
      trade_volume_bracket: "₹25L - ₹50L",
      website_url: "https://urbanwear.karobar.in"
    },
    {
      user_id: guptaOwner.id,
      verified_gst: true,
      profile_completeness_pct: 92,
      year_established: 2012,
      about_text: "Authorized regional distributor for Amul Dairy, Tata Consumer, and ITC packaged foods.",
      trade_volume_bracket: "₹1Cr - ₹5Cr",
      website_url: "https://guptafmcg.karobar.in"
    },
    {
      user_id: apexOwner.id,
      verified_gst: true,
      profile_completeness_pct: 85,
      year_established: 2021,
      about_text: "Manufacturer of biodegradable food containers, carry bags, and eco-friendly packaging supplies.",
      trade_volume_bracket: "₹10L - ₹25L",
      website_url: "https://apexpackaging.karobar.in"
    }
  ];

  await supabase.from("business_network_profiles").upsert(profilePayloads, { onConflict: "user_id" });

  // B. Pillar 1: Connected Partners & Pending Invitations
  const connectionPayloads = [
    {
      requester_id: vermaOwner.id,
      receiver_id: sharmaOwner.id,
      connection_type: "Supplier",
      status: "accepted",
      trade_volume: 345000,
      notes: "Primary grain & bulk staple commodities supplier",
      created_at: daysAgo(45)
    },
    {
      requester_id: guptaOwner.id,
      receiver_id: sharmaOwner.id,
      connection_type: "Supplier",
      status: "accepted",
      trade_volume: 120000,
      notes: "FMCG, dairy, and confectionery supplier",
      created_at: daysAgo(30)
    },
    {
      requester_id: sharmaOwner.id,
      receiver_id: urbanwearOwner.id,
      connection_type: "Partner",
      status: "accepted",
      trade_volume: 65000,
      notes: "Retail trade cross-partner",
      created_at: daysAgo(20)
    },
    {
      requester_id: apexOwner.id,
      receiver_id: sharmaOwner.id,
      connection_type: "Supplier",
      status: "pending",
      trade_volume: 0,
      notes: "Requested connection to supply bio-degradable bags & packaging",
      created_at: daysAgo(1)
    }
  ];

  const { data: createdConnections } = await supabase
    .from("business_connections")
    .insert(connectionPayloads)
    .select();

  const connVermaSharma = createdConnections?.find(c => c.requester_id === vermaOwner.id || c.receiver_id === vermaOwner.id);
  const connGuptaSharma = createdConnections?.find(c => c.requester_id === guptaOwner.id || c.receiver_id === guptaOwner.id);
  const connSharmaUrban = createdConnections?.find(c => c.receiver_id === urbanwearOwner.id || c.requester_id === urbanwearOwner.id);

  // C. Pillar 2: Trade Inbox (Invoices received by Sharma General Store)
  // 1. Pending Review invoice (Gupta -> Sharma) - Ready to test 1-Click Import!
  const { data: txInboxPending } = await supabase
    .from("trade_transactions")
    .insert({
      sender_id: guptaOwner.id,
      receiver_id: sharmaOwner.id,
      connection_id: connGuptaSharma?.id || null,
      invoice_no: "TRD-2026-IN-01",
      invoice_date: daysAgo(0).split("T")[0],
      subtotal: 19700,
      tax_amount: 1178,
      total_amount: 20878,
      status: "Pending",
      notes: "Weekly dairy & packaged tea shipment batch #9021",
      created_at: daysAgo(0, 9, 30)
    })
    .select()
    .single();

  if (txInboxPending) {
    await supabase.from("trade_transaction_items").insert([
      {
        transaction_id: txInboxPending.id,
        product_name: "Amul Pasteurised Butter (500g)",
        sku: "DAI-BUT-500",
        quantity: 30,
        purchase_price: 240,
        gst_percent: 12,
        category: "Dairy & Fresh",
        unit: "packs",
        total: 8064
      },
      {
        transaction_id: txInboxPending.id,
        product_name: "Tata Sampann Unpolished Toor Dal (1kg)",
        sku: "GRN-DAL-01K",
        quantity: 50,
        purchase_price: 135,
        gst_percent: 0,
        category: "Grains & Pulses",
        unit: "pkts",
        total: 6750
      },
      {
        transaction_id: txInboxPending.id,
        product_name: "Brooke Bond Red Label Tea (500g)",
        sku: "BEV-RED-500",
        quantity: 25,
        purchase_price: 230,
        gst_percent: 5,
        category: "Beverages",
        unit: "pkts",
        total: 6038
      }
    ]);
  }

  // 2. Viewed invoice (Verma -> Sharma)
  const { data: txInboxViewed } = await supabase
    .from("trade_transactions")
    .insert({
      sender_id: vermaOwner.id,
      receiver_id: sharmaOwner.id,
      connection_id: connVermaSharma?.id || null,
      invoice_no: "TRD-2026-IN-02",
      invoice_date: daysAgo(3).split("T")[0],
      subtotal: 58200,
      tax_amount: 2910,
      total_amount: 61110,
      status: "Viewed",
      notes: "Bulk Kolam Rice & Sharbati Wheat sacks delivery",
      created_at: daysAgo(3, 11, 0)
    })
    .select()
    .single();

  if (txInboxViewed) {
    await supabase.from("trade_transaction_items").insert([
      {
        transaction_id: txInboxViewed.id,
        product_name: "Premium Kolam Rice (50kg Jute Sack)",
        sku: "WHL-RICE-50K",
        quantity: 15,
        purchase_price: 2400,
        gst_percent: 5,
        category: "Commodities",
        unit: "sacks",
        total: 37800
      },
      {
        transaction_id: txInboxViewed.id,
        product_name: "MP Sharbati Wheat (50kg Sack)",
        sku: "WHL-WHT-50K",
        quantity: 12,
        purchase_price: 1850,
        gst_percent: 5,
        category: "Commodities",
        unit: "sacks",
        total: 23310
      }
    ]);
  }

  // 3. Imported invoice (Verma -> Sharma)
  const { data: txInboxImported } = await supabase
    .from("trade_transactions")
    .insert({
      sender_id: vermaOwner.id,
      receiver_id: sharmaOwner.id,
      connection_id: connVermaSharma?.id || null,
      invoice_no: "TRD-2026-IN-03",
      invoice_date: daysAgo(7).split("T")[0],
      subtotal: 42500,
      tax_amount: 2125,
      total_amount: 44625,
      status: "Imported",
      notes: "Soyabean Oil & Sugar commercial lot - Imported into Stock",
      created_at: daysAgo(7, 14, 0)
    })
    .select()
    .single();

  if (txInboxImported) {
    await supabase.from("trade_transaction_items").insert([
      {
        transaction_id: txInboxImported.id,
        product_name: "Refined Soyabean Oil Commercial Tin (15L)",
        sku: "WHL-OIL-15L",
        quantity: 20,
        purchase_price: 1650,
        gst_percent: 5,
        category: "Edible Oils",
        unit: "tins",
        total: 34650
      },
      {
        transaction_id: txInboxImported.id,
        product_name: "Refined White Sugar M-30 Grade (50kg Bag)",
        sku: "WHL-SUG-50K",
        quantity: 5,
        purchase_price: 1900,
        gst_percent: 5,
        category: "Commodities",
        unit: "bags",
        total: 9975
      }
    ]);
  }

  // 4. Rejected invoice (Gupta -> Sharma)
  const { data: txInboxRejected } = await supabase
    .from("trade_transactions")
    .insert({
      sender_id: guptaOwner.id,
      receiver_id: sharmaOwner.id,
      connection_id: connGuptaSharma?.id || null,
      invoice_no: "TRD-2026-IN-04",
      invoice_date: daysAgo(12).split("T")[0],
      subtotal: 8550,
      tax_amount: 1539,
      total_amount: 10089,
      status: "Rejected",
      notes: "Billed unit price discrepancy. Credit note requested.",
      created_at: daysAgo(12, 10, 0)
    })
    .select()
    .single();

  if (txInboxRejected) {
    await supabase.from("trade_transaction_items").insert([
      {
        transaction_id: txInboxRejected.id,
        product_name: "Nescafe Classic Instant Coffee Jar (100g)",
        sku: "BEV-NES-100",
        quantity: 30,
        purchase_price: 285,
        gst_percent: 18,
        category: "Beverages",
        unit: "jars",
        total: 10089
      }
    ]);
  }

  // D. Pillar 3: Trade Outbox (Invoices sent by Sharma General Store to UrbanWear)
  // 1. Accepted Outbox Invoice
  const { data: txOutboxAccepted } = await supabase
    .from("trade_transactions")
    .insert({
      sender_id: sharmaOwner.id,
      receiver_id: urbanwearOwner.id,
      connection_id: connSharmaUrban?.id || null,
      invoice_no: "TRD-2026-OUT-01",
      invoice_date: daysAgo(2).split("T")[0],
      subtotal: 10820,
      tax_amount: 1948,
      total_amount: 12768,
      status: "Accepted",
      notes: "Staff pantry supplies & hand sanitizers",
      created_at: daysAgo(2, 16, 0)
    })
    .select()
    .single();

  if (txOutboxAccepted) {
    await supabase.from("trade_transaction_items").insert([
      {
        transaction_id: txOutboxAccepted.id,
        product_name: "Nescafe Classic Instant Coffee Jar (100g)",
        sku: "BEV-NES-100",
        quantity: 20,
        purchase_price: 285,
        gst_percent: 18,
        unit: "jars",
        total: 6726
      },
      {
        transaction_id: txOutboxAccepted.id,
        product_name: "Dettol Original Germ Protection Soap (125g x 3)",
        sku: "PER-DET-125",
        quantity: 40,
        purchase_price: 128,
        gst_percent: 18,
        unit: "packs",
        total: 6042
      }
    ]);
  }

  // 2. Viewed Outbox Invoice
  const { data: txOutboxViewed } = await supabase
    .from("trade_transactions")
    .insert({
      sender_id: sharmaOwner.id,
      receiver_id: urbanwearOwner.id,
      connection_id: connSharmaUrban?.id || null,
      invoice_no: "TRD-2026-OUT-02",
      invoice_date: daysAgo(5).split("T")[0],
      subtotal: 4720,
      tax_amount: 566,
      total_amount: 5286,
      status: "Viewed",
      notes: "Event beverages and snacks delivery",
      created_at: daysAgo(5, 11, 30)
    })
    .select()
    .single();

  if (txOutboxViewed) {
    await supabase.from("trade_transaction_items").insert([
      {
        transaction_id: txOutboxViewed.id,
        product_name: "Maaza Mango Drink Bottle (1.2L)",
        sku: "BEV-MAN-01L",
        quantity: 60,
        purchase_price: 52,
        gst_percent: 12,
        unit: "bottles",
        total: 3494
      },
      {
        transaction_id: txOutboxViewed.id,
        product_name: "Lay's India's Magic Masala Chips (50g)",
        sku: "SNK-LAY-50G",
        quantity: 100,
        purchase_price: 16,
        gst_percent: 12,
        unit: "pkts",
        total: 1792
      }
    ]);
  }

  // 3. Pending Outbox Invoice
  const { data: txOutboxPending } = await supabase
    .from("trade_transactions")
    .insert({
      sender_id: sharmaOwner.id,
      receiver_id: urbanwearOwner.id,
      connection_id: connSharmaUrban?.id || null,
      invoice_no: "TRD-2026-OUT-03",
      invoice_date: daysAgo(0).split("T")[0],
      subtotal: 8500,
      tax_amount: 1530,
      total_amount: 10030,
      status: "Pending",
      notes: "Storage boxes and barcode printer supplies",
      created_at: daysAgo(0, 15, 0)
    })
    .select()
    .single();

  if (txOutboxPending) {
    await supabase.from("trade_transaction_items").insert([
      {
        transaction_id: txOutboxPending.id,
        product_name: "EcoPack Containers & Boxes (500ml)",
        sku: "HME-ECO-500",
        quantity: 100,
        purchase_price: 45,
        gst_percent: 18,
        unit: "pcs",
        total: 5310
      },
      {
        transaction_id: txOutboxPending.id,
        product_name: "Thermal Barcode Label Rolls (50x25mm)",
        sku: "HME-LBL-50X",
        quantity: 50,
        purchase_price: 80,
        gst_percent: 18,
        unit: "rolls",
        total: 4720
      }
    ]);
  }

  // E. Pillar 4: Trade Credit (Credit Given & Credit Received)
  const creditPayloads = [
    // Credit Given (Sharma -> UrbanWear): Receivables
    {
      supplier_id: sharmaOwner.id,
      buyer_id: urbanwearOwner.id,
      credit_limit: 100000,
      outstanding_amount: 28084,
      utilized_amount: 28084,
      payment_terms_days: 30,
      due_date: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "active",
      notes: "Net 30 days corporate credit limit for boutique branch"
    },
    // Credit Received (Verma -> Sharma): Payables
    {
      supplier_id: vermaOwner.id,
      buyer_id: sharmaOwner.id,
      credit_limit: 250000,
      outstanding_amount: 61110,
      utilized_amount: 61110,
      payment_terms_days: 15,
      due_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "active",
      notes: "APMC Wholesale Depot commodity credit line"
    },
    // Credit Received (Gupta -> Sharma): Payables
    {
      supplier_id: guptaOwner.id,
      buyer_id: sharmaOwner.id,
      credit_limit: 150000,
      outstanding_amount: 20878,
      utilized_amount: 20878,
      payment_terms_days: 21,
      due_date: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "active",
      notes: "FMCG distribution credit line (Net 21 days)"
    }
  ];

  await supabase.from("trade_credit_accounts").upsert(creditPayloads, { onConflict: "supplier_id,buyer_id" });

  // F. Pillar 5: Trust Scores & Metrics
  const reputationMetricsPayload = [
    {
      user_id: sharmaOwner.id,
      completed_trades: 14,
      cancelled_trades: 0,
      disputes_raised: 0,
      disputes_lost: 0,
      late_payments: 0,
      avg_payment_delay_days: 0.0,
      response_rate_pct: 98,
      gst_verified: true,
      profile_completeness_pct: 100,
      connection_acceptance_rate_pct: 95,
      review_count: 8,
      review_average: 4.9
    },
    {
      user_id: vermaOwner.id,
      completed_trades: 42,
      cancelled_trades: 1,
      disputes_raised: 0,
      disputes_lost: 0,
      late_payments: 1,
      avg_payment_delay_days: 1.2,
      response_rate_pct: 94,
      gst_verified: true,
      profile_completeness_pct: 95,
      connection_acceptance_rate_pct: 90,
      review_count: 24,
      review_average: 4.8
    },
    {
      user_id: guptaOwner.id,
      completed_trades: 18,
      cancelled_trades: 0,
      disputes_raised: 1,
      disputes_lost: 0,
      late_payments: 0,
      avg_payment_delay_days: 0.0,
      response_rate_pct: 92,
      gst_verified: true,
      profile_completeness_pct: 90,
      connection_acceptance_rate_pct: 85,
      review_count: 12,
      review_average: 4.7
    },
    {
      user_id: urbanwearOwner.id,
      completed_trades: 9,
      cancelled_trades: 0,
      disputes_raised: 0,
      disputes_lost: 0,
      late_payments: 0,
      avg_payment_delay_days: 0.0,
      response_rate_pct: 90,
      gst_verified: true,
      profile_completeness_pct: 85,
      connection_acceptance_rate_pct: 88,
      review_count: 5,
      review_average: 4.6
    },
    {
      user_id: apexOwner.id,
      completed_trades: 3,
      cancelled_trades: 0,
      disputes_raised: 0,
      disputes_lost: 0,
      late_payments: 0,
      avg_payment_delay_days: 0.0,
      response_rate_pct: 80,
      gst_verified: true,
      profile_completeness_pct: 80,
      connection_acceptance_rate_pct: 80,
      review_count: 2,
      review_average: 4.4
    }
  ];

  await supabase.from("business_reputation_metrics").upsert(reputationMetricsPayload, { onConflict: "user_id" });

  // Reputation history events
  const reputationEvents = [
    { user_id: sharmaOwner.id, event_type: "GST_VERIFIED", impact_score: 10, context: { gstin: "07AAAAA1234A1Z1" } },
    { user_id: sharmaOwner.id, event_type: "TRADE_COMPLETED", impact_score: 5, context: { invoice_no: "TRD-2026-IN-03" } },
    { user_id: sharmaOwner.id, event_type: "PAYMENT_ON_TIME", impact_score: 5, context: { supplier: "Verma Wholesale" } },
    { user_id: sharmaOwner.id, event_type: "CONNECTION_ACCEPTED", impact_score: 2, context: { partner: "Gupta FMCG" } }
  ];

  await supabase.from("business_reputation_history").insert(reputationEvents);

  console.log(`✅ Seeded Business Network 5 Pillars (Partners, Inbox, Outbox, Credit, Trust Scores).`);

  console.log("==========================================================");
  console.log("🎉 Karobar Demo Environment Seeded Successfully!");
  console.log("==========================================================");
  console.log("All accounts password: " + DEMO_PASSWORD);
  console.log("Owner:        demo.owner@karobar.test (Sharma General Store - Retail Kirana)");
  console.log("Manager:      demo.manager@karobar.test");
  console.log("Cashier:      demo.cashier@karobar.test");
  console.log("Accountant:   demo.accountant@karobar.test");
  console.log("Inventory:    demo.inventory@karobar.test");
  console.log("Delivery:     demo.delivery@karobar.test");
  console.log("Wholesale:    demo.wholesale@karobar.test (Verma Wholesale Traders - Commodity Supplier)");
  console.log("Apparel:      demo.apparel@karobar.test (UrbanWear Store - Connected Buyer)");
  console.log("Distributor:  demo.distributor@karobar.test (Gupta FMCG - FMCG Supplier)");
  console.log("Packaging:    demo.packaging@karobar.test (Apex Packaging - Pending Partner)");
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
