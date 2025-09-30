import { db } from "../server/db"; // ajuste le chemin si nécessaire
import { users, alerts, alertValidations, activityLogs, sessions } from "../shared/schema";
import { eq } from "drizzle-orm";

// Exemple de fonction de seed
async function seed() {
  console.log("🌱 Starting database seed...");

  // Nettoyage (optionnel en dev)
  await db.delete(activityLogs);
  await db.delete(alertValidations);
  await db.delete(alerts);
  await db.delete(users);
  await db.delete(sessions);

  // Insérer un utilisateur admin par défaut
  await db.insert(users).values({
    id: "usr_admin_001",
    name: "Admin User",
    email: "admin@example.com",
    phone: "0340000000",
    password: "admin2024", // ⚠️ en clair pour dev, à remplacer par hash en prod
    isAdmin: true,
    firstName: "Admin",
    lastName: "User",
  });

  // Exemple d’alerte
  await db.insert(alerts).values({
    id: "alrt_test_001",
    title: "Test Alert",
    description: "Ceci est une alerte de test.",
    reason: "security",
    status: "pending",
    userId: "usr_admin_001",
    location: { lat: -18.8792, lng: 47.5079 }, // Antananarivo
  });

  console.log("✅ Database seeded successfully!");
}

// ✅ Compatible ESM (remplace require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
}
