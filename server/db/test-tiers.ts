import { db } from "../db.js";
import { sql } from "drizzle-orm";

async function testTiers() {
  try {
    const tiers = await db.execute(sql`
      SELECT id, name, display_name, price_monthly, sort_order
      FROM subscription_tiers
      ORDER BY sort_order
    `);

    console.log('\n📊 Current Database Tiers:\n');
    for (const tier of tiers.rows) {
      const t = tier as any;
      console.log(`${t.sort_order}. ${t.display_name} (${t.id})`);
      console.log(`   Price: $${t.price_monthly / 100}/month\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testTiers();
