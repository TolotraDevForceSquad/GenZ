// scripts/reset-db.ts
import { db } from "../server/db";
import { users, alerts, alertValidations, activityLogs, sessions } from "../shared/schema";

async function resetDb() {
  console.log("🗑️ Resetting database...");

  await db.delete(activityLogs);
  await db.delete(alertValidations);
  await db.delete(alerts);
  await db.delete(users);
  await db.delete(sessions);

  console.log("✅ Database reset complete!");
}

resetDb().then(() => process.exit(0));
