-- Add CHECK constraint to validate niche values
-- This prevents prompt injection at the database layer

ALTER TABLE user_preferences
DROP CONSTRAINT IF EXISTS valid_niche;

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
);
