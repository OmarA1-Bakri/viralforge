import { db } from "../db.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function makeAdmin() {
  const username = process.argv[2] || "admin";
  const password = process.argv[3] || "admin123";

  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user to admin
      await db
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.username, username));

      console.log(`✅ Updated ${username} to admin role`);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10);

      await db.insert(users).values({
        username,
        password: hashedPassword,
        role: "admin"
      });

      console.log(`✅ Created new admin user: ${username}`);
      console.log(`   Password: ${password}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

makeAdmin();
