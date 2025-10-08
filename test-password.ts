import * as bcrypt from 'bcrypt';

async function test() {
  const password = 'Nelson0!';
  const hash = '$2b$10$8X5YhZvNQKxEJ1J8qF5F0.hVdB2sQWvN5rJKXqL9mN5pO7qR9sT8u';
  
  const isValid = await bcrypt.compare(password, hash);
  console.log('Password:', password);
  console.log('Hash:', hash.substring(0, 30) + '...');
  console.log('Valid:', isValid);
  
  // Generate a new hash
  const newHash = await bcrypt.hash(password, 10);
  console.log('\nNew hash:', newHash);
  const testNew = await bcrypt.compare(password, newHash);
  console.log('New hash valid:', testNew);
}

test();
