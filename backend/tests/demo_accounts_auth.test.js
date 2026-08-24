import { test, describe } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../src/config/db.js";

const DEMO_PASSWORD = "Karobar@12345";
const DEMO_ACCOUNTS = [
  { email: "demo.owner@karobar.test", orgName: "Sharma General Store" },
  { email: "demo.manager@karobar.test", orgName: "Sharma General Store" },
  { email: "demo.cashier@karobar.test", orgName: "Sharma General Store" },
  { email: "demo.accountant@karobar.test", orgName: "Sharma General Store" },
  { email: "demo.inventory@karobar.test", orgName: "Sharma General Store" },
  { email: "demo.delivery@karobar.test", orgName: "Sharma General Store" },
  { email: "demo.wholesale@karobar.test", orgName: "Verma Wholesale Traders" },
  { email: "demo.apparel@karobar.test", orgName: "UrbanWear Store" }
];

describe("Karobar Demo Accounts & Seed Validation Tests", () => {
  test("1. All 8 demo accounts exist in database with active status", async () => {
    const emails = DEMO_ACCOUNTS.map(a => a.email);
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, business_name, organization_id, is_active, password")
      .in("email", emails);

    assert.equal(error, null, `Database error fetching users: ${error?.message}`);
    assert.equal(users.length, 8, `Expected 8 seeded demo users, found ${users?.length}`);

    for (const acc of DEMO_ACCOUNTS) {
      const user = users.find(u => u.email === acc.email);
      assert.ok(user, `User ${acc.email} not found in database`);
      assert.equal(user.is_active, true, `User ${acc.email} should be active`);
      assert.ok(user.organization_id, `User ${acc.email} must belong to an organization`);
    }
  });

  test("2. All 8 demo accounts authenticate successfully with password 'Karobar@12345'", async () => {
    const emails = DEMO_ACCOUNTS.map(a => a.email);
    const { data: users, error } = await supabase
      .from("users")
      .select("email, password")
      .in("email", emails);

    assert.equal(error, null);

    for (const user of users) {
      const isMatch = await bcrypt.compare(DEMO_PASSWORD, user.password);
      assert.equal(isMatch, true, `Password mismatch for ${user.email} with '${DEMO_PASSWORD}'`);

      const isBadMatch = await bcrypt.compare("WrongPassword@999", user.password);
      assert.equal(isBadMatch, false, `Bad password incorrectly matched for ${user.email}`);
    }
  });

  test("3. Demo organizations and branch stores are properly mapped", async () => {
    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name");

    assert.equal(orgErr, null);
    const orgNames = (orgs || []).map(o => o.name);
    assert.ok(orgNames.includes("Sharma General Store"), "Sharma General Store org missing");
    assert.ok(orgNames.includes("Verma Wholesale Traders"), "Verma Wholesale Traders org missing");
    assert.ok(orgNames.includes("UrbanWear Store"), "UrbanWear Store org missing");

    const { data: stores, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, user_id");

    assert.equal(storeErr, null);
    assert.ok(stores.length >= 3, `Expected at least 3 store branches, found ${stores.length}`);
  });

  test("4. Seeded Inventory, Batches, Customers, and Sales records exist", async () => {
    const { count: productCount, error: pErr } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true });
    assert.equal(pErr, null);
    assert.ok(productCount >= 30, `Expected at least 30 products in DB, got ${productCount}`);

    const { count: batchCount, error: bErr } = await supabase
      .from("inventory_batches")
      .select("*", { count: "exact", head: true });
    assert.equal(bErr, null);
    assert.ok(batchCount >= 30, `Expected at least 30 inventory batches in DB, got ${batchCount}`);

    const { count: customerCount, error: cErr } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });
    assert.equal(cErr, null);
    assert.ok(customerCount >= 10, `Expected at least 10 customers in DB, got ${customerCount}`);

    const { count: salesCount, error: sErr } = await supabase
      .from("sales")
      .select("*", { count: "exact", head: true });
    assert.equal(sErr, null);
    assert.ok(salesCount >= 15, `Expected at least 15 sales in DB, got ${salesCount}`);
  });

  test("5. JWT token generation and verification for demo accounts", async () => {
    const secret = process.env.JWT_SECRET || "2jL#9xQ7pV!sF3mZ8yW0bR6uA4tC1dE5";
    const demoOwner = DEMO_ACCOUNTS[0];

    const token = jwt.sign(
      { email: demoOwner.email, name: "Piyush Sharma (Owner)" },
      secret,
      { expiresIn: "7d" }
    );

    assert.ok(token, "Token should be generated");
    const decoded = jwt.verify(token, secret);
    assert.equal(decoded.email, demoOwner.email);
    assert.equal(decoded.name, "Piyush Sharma (Owner)");
  });
});
