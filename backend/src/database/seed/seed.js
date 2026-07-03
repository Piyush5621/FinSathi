/**
 * Deterministic database seeder for E2E tests
 */

const seedUsers = async () => {
  console.log('[Seed] Seeding Users...');
  // await db.users.insert(...)
};

const seedProfiles = async () => {
  console.log('[Seed] Seeding Profiles...');
  // await db.profiles.insert(...)
};

const run = async () => {
  try {
    console.log('[Seed] Starting database seed process...');
    
    // Clear existing test data
    console.log('[Seed] Wiping existing data...');
    // await db.clearAll();

    // Run modular seeds in dependency order
    await seedUsers();
    await seedProfiles();

    console.log('[Seed] Database seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Failed to seed database:', error);
    process.exit(1);
  }
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run();
}

export default run;
