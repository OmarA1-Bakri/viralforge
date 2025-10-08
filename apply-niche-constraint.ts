import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function applyConstraint() {
  console.log('Applying niche constraint to database...');

  try {
    // Drop existing constraint if it exists
    await db.execute(sql`
      ALTER TABLE user_preferences
      DROP CONSTRAINT IF EXISTS valid_niche
    `);

    // Add new constraint with valid niches
    await db.execute(sql`
      ALTER TABLE user_preferences
      ADD CONSTRAINT valid_niche CHECK (
        niche IN (
          'Gaming',
          'Tech',
          'Finance',
          'Lifestyle',
          'Education',
          'Entertainment',
          'Health & Fitness',
          'Beauty & Fashion',
          'Food & Cooking',
          'Travel',
          'Music',
          'Sports',
          'Business',
          'Art & Design',
          'DIY & Crafts',
          'Parenting',
          'News & Politics',
          'Science',
          'Comedy',
          'Vlog'
        )
      )
    `);

    console.log('✅ Niche constraint applied successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed to apply constraint:', error.message);
    process.exit(1);
  }
}

applyConstraint();
